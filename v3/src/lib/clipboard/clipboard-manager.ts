import { isAlive } from "@concord-consortium/mobx-state-tree"
import { action, makeObservable, observable } from "mobx"
import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import { Logger } from "../logger"
import { ILogMessage, logStringifiedObjectMessage } from "../log-message"
import { ClipboardImportFormat, importClipboardContent } from "./clipboard-import"
import {
  ClipboardReadMethod, ClipboardUnavailableError, ClipboardWriteMethod, focusDocumentForClipboard,
  getReturnFocusTarget, IClipboardContent, IClipboardReadResult, isClipboardReadDenied, readClipboard,
  writeWithClipboardApi, writeWithExecCommand
} from "./clipboard-utils"

type ClipboardImportMethod = ClipboardReadMethod | "paste"
type ClipboardImportOutcome = "imported" | "empty" | "cancelled"

export interface IPasteRequest {
  dataSet?: IDataSet
  // The document that was current when the import started
  document?: object
  permissionDenied: boolean
  // Where focus should go when the paste dialog closes
  returnFocus?: HTMLElement
}

// The read attempt that led to the paste dialog, so its log event can report it when the dialog closes
interface IPendingPasteLog {
  failed: string
  skipped: string
}

// How long an unfinished read blocks further imports. A read can stay pending while the browser waits on
// the user (a permission prompt or Paste callout), and a double-click shouldn't import twice, but a read
// that never finishes mustn't block imports for the rest of the session.
export const kClipboardReadBusyMs = 10000

export type ClipboardMessage =
  { kind: "copied", description: string } | { kind: "copyUnavailable" } | { kind: "emptyClipboard" }

/**
 * Owns all clipboard access for CODAP. Browsers can refuse the Clipboard API for reasons the user can't
 * fix (an iframe without clipboard permissions, lost focus or user activation, a dismissed iOS Paste
 * callout), so each operation falls back to an alternative. Only failures that are likely to last are
 * remembered for the rest of the page session:
 * - A failed writeText() is skipped on later copies, so execCommand("copy") runs synchronously within the
 *   click rather than after an await, when the click may no longer count as user activation. A failed
 *   execCommand("copy") isn't remembered, since it's often caused by exactly that lost activation.
 * - A failed read is remembered only if the Clipboard API is missing or the browser reports that reading
 *   is denied. Other read failures, such as lost focus or a dismissed Paste callout, are often temporary,
 *   so the next import tries reading again.
 *
 * The manager doesn't ask for clipboard permission up front. Chrome prompts on the first read anyway, and
 * most refusals come from the context rather than a prompt the user could accept, so an extra request would
 * only be noise.
 *
 * The manager never renders anything. It exposes observable state describing what the UI should show,
 * which the app-level ClipboardHost renders. Clipboard refusals never cause a rejection.
 */
export class ClipboardManager {
  @observable private writeTextFailed = false
  @observable private readFailed = false
  @observable.ref private _message: Maybe<ClipboardMessage> = undefined
  @observable.ref private _pasteRequest: Maybe<IPasteRequest> = undefined
  private pendingPasteLog: Maybe<IPendingPasteLog>
  // When the newest read started, or undefined if no read is in progress
  private readStartTime: Maybe<number>
  // Identifies the newest read, so a read that finishes after a newer one started is ignored
  private readAttempt = 0

  constructor() {
    makeObservable(this)
  }

  get message() {
    return this._message
  }

  get pasteRequest() {
    return this._pasteRequest
  }

  @action
  closeMessage() {
    this._message = undefined
  }

  @action
  reset() {
    this.writeTextFailed = false
    this.readFailed = false
    this._message = undefined
    this._pasteRequest = undefined
    this.pendingPasteLog = undefined
    this.readStartTime = undefined
    this.readAttempt++
  }

  // Copies `text` to the clipboard. `description` fills the "Copied %@ to the clipboard" message.
  // Resolves true if the text was copied.
  async copyText(text: string, description: string): Promise<boolean> {
    const failed: ClipboardWriteMethod[] = []
    const skipped: ClipboardWriteMethod[] = []
    let method: ClipboardWriteMethod | undefined

    if (this.writeTextFailed) {
      skipped.push("writeText")
    } else if (await writeWithClipboardApi(text)) {
      method = "writeText"
    } else {
      failed.push("writeText")
      this.setWriteTextFailed()
    }

    if (!method) {
      if (writeWithExecCommand(text)) {
        method = "execCommand"
      } else {
        failed.push("execCommand")
      }
    }

    this.setMessage(method ? { kind: "copied", description } : { kind: "copyUnavailable" })
    this.log(logStringifiedObjectMessage("Copy to clipboard: %@", {
      method: method ?? "none",
      failed: failed.join(","),
      skipped: skipped.join(","),
      outcome: method ? "copied" : "unavailable"
    }, "data"))
    return !!method
  }

  // Imports clipboard data into `dataSet`, or into a new dataset if none is given. If the clipboard can't be
  // read, requests the paste dialog instead. Ignored while the paste dialog is open, or while a read that
  // started less than kClipboardReadBusyMs ago is still pending.
  async importData(dataSet?: IDataSet): Promise<void> {
    if (this.isReadInProgress() || this._pasteRequest) return

    // Captured before reading, which blurs the focused element
    const returnFocus = getReturnFocusTarget()
    const document = appState.document
    if (this.readFailed) {
      return this.requestPaste({ dataSet, document, returnFocus }, { failed: "", skipped: "read" })
    }

    const attempt = ++this.readAttempt
    this.readStartTime = Date.now()
    let result: Maybe<IClipboardReadResult>
    try {
      focusDocumentForClipboard()
      result = await readClipboard()
    } catch (error) {
      if (attempt !== this.readAttempt) return
      this.readStartTime = undefined
      if (error instanceof ClipboardUnavailableError) this.setReadFailed()
      return this.requestPaste({ dataSet, document, returnFocus }, { failed: "read", skipped: "" })
    }
    if (attempt !== this.readAttempt) return
    this.readStartTime = undefined

    // Only the read is guarded. An error importing data that was read successfully is a genuine bug,
    // so it propagates rather than being mistaken for a clipboard refusal.
    const format = importClipboardContent(result.content, this.currentTarget(dataSet, document))
    if (!format) this.setMessage({ kind: "emptyClipboard" })
    this.logImport(result.method, format ? "imported" : "empty", { format })
  }

  // Called by the paste dialog's Import button
  importPastedData(content: IClipboardContent) {
    const request = this._pasteRequest
    if (!request) return
    this.setPasteRequest(undefined)
    const format = importClipboardContent(content, this.currentTarget(request.dataSet, request.document))
    this.logImport("paste", format ? "imported" : "empty", { format, ...this.pendingPasteLog }, request)
    this.pendingPasteLog = undefined
  }

  // Called by the paste dialog's Cancel and close buttons
  cancelPaste() {
    const request = this._pasteRequest
    if (!request) return
    this.setPasteRequest(undefined)
    this.logImport("paste", "cancelled", { ...this.pendingPasteLog }, request)
    this.pendingPasteLog = undefined
  }

  // The dataset to import into, or undefined to import into a new dataset. A target that was deleted, or
  // that belongs to a document that has since been replaced, is dropped: the importers find their target by
  // name in the current document, so a stale target could append to an unrelated dataset with the same name.
  private currentTarget(dataSet: Maybe<IDataSet>, document: Maybe<object>) {
    return dataSet && isAlive(dataSet) && document === appState.document ? dataSet : undefined
  }

  private isReadInProgress() {
    return this.readStartTime != null && Date.now() - this.readStartTime < kClipboardReadBusyMs
  }

  // Opens the paste dialog right away, then adds the permission note if the permission check reports
  // that reading is denied. The check runs afterwards so the dialog never waits on it. A denial lasts until
  // the user changes a setting, so later imports go straight to the paste dialog.
  private async requestPaste(target: Omit<IPasteRequest, "permissionDenied">, pasteLog: IPendingPasteLog) {
    const request: IPasteRequest = { ...target, permissionDenied: false }
    this.pendingPasteLog = pasteLog
    this.setPasteRequest(request)
    if (await isClipboardReadDenied()) {
      this.setReadFailed()
      if (this._pasteRequest === request) {
        this.setPasteRequest({ ...request, permissionDenied: true })
      }
    }
  }

  private logImport(method: ClipboardImportMethod, outcome: ClipboardImportOutcome,
                    options: { format?: ClipboardImportFormat, failed?: string, skipped?: string },
                    request?: IPasteRequest) {
    this.log(logStringifiedObjectMessage("Import from clipboard: %@", {
      method,
      failed: options.failed ?? "",
      skipped: options.skipped ?? "",
      outcome,
      format: options.format ?? "",
      permissionDenied: request?.permissionDenied ?? false
    }, "data"))
  }

  private log({ message, args, category }: ILogMessage) {
    Logger.log(message, args, category)
  }

  @action
  private setWriteTextFailed() {
    this.writeTextFailed = true
  }

  @action
  private setReadFailed() {
    this.readFailed = true
  }

  @action
  private setPasteRequest(request: Maybe<IPasteRequest>) {
    this._pasteRequest = request
  }

  @action
  private setMessage(message: ClipboardMessage) {
    this._message = message
  }
}

export const clipboardManager = new ClipboardManager()
