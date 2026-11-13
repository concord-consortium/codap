import { isAlive } from "@concord-consortium/mobx-state-tree"
import { action, makeObservable, observable } from "mobx"
import { IDataSet } from "../../models/data/data-set"
import { ClipboardImportFormat, importClipboardContent } from "../../utilities/clipboard-import"
import { Logger } from "../logger"
import { ILogMessage, logStringifiedObjectMessage } from "../log-message"
import {
  ClipboardReadMethod, focusDocumentForClipboard, IClipboardContent, IClipboardReadResult, isClipboardReadDenied,
  readClipboard, writeWithExecCommand
} from "./clipboard-utils"

type ClipboardWriteMethod = "writeText" | "execCommand"
type ClipboardImportMethod = ClipboardReadMethod | "paste" | "none"
type ClipboardImportOutcome = "imported" | "empty" | "cancelled"

export interface IPasteRequest {
  dataSet?: IDataSet
  permissionDenied: boolean
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
 * callout), so each operation falls back to an alternative, and failures are remembered for the rest of
 * the page session so the user doesn't wait on an attempt that's known to fail.
 *
 * The manager never renders anything. It exposes observable state describing what the UI should show,
 * which the app-level ClipboardHost renders. Clipboard refusals never cause a rejection.
 */
export class ClipboardManager {
  @observable private writeTextFailed = false
  @observable private execCommandFailed = false
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
    this.execCommandFailed = false
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
    } else if (await this.tryWriteText(text)) {
      method = "writeText"
    } else {
      failed.push("writeText")
      this.setFailed("writeText")
    }

    if (!method) {
      if (this.execCommandFailed) {
        skipped.push("execCommand")
      } else if (writeWithExecCommand(text)) {
        method = "execCommand"
      } else {
        failed.push("execCommand")
        this.setFailed("execCommand")
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

    if (this.readFailed) {
      return this.requestPaste(dataSet, { failed: "", skipped: "read" })
    }

    const attempt = ++this.readAttempt
    this.readStartTime = Date.now()
    let result: Maybe<IClipboardReadResult>
    try {
      focusDocumentForClipboard()
      result = await readClipboard()
    } catch {
      if (attempt !== this.readAttempt) return
      this.readStartTime = undefined
      this.setReadFailed()
      return this.requestPaste(dataSet, { failed: "read", skipped: "" })
    }
    if (attempt !== this.readAttempt) return
    this.readStartTime = undefined

    // Only the read is guarded. An error importing data that was read successfully is a genuine bug,
    // so it propagates rather than being mistaken for a clipboard refusal.
    const format = importClipboardContent(result.content, dataSet)
    if (!format) this.setMessage({ kind: "emptyClipboard" })
    this.logImport(result.method, format ? "imported" : "empty", { format })
  }

  // Called by the paste dialog's Import button
  importPastedData(content: IClipboardContent) {
    const request = this._pasteRequest
    if (!request) return
    // The target dataset may have been deleted while the dialog was open
    const dataSet = request.dataSet && isAlive(request.dataSet) ? request.dataSet : undefined
    this.setPasteRequest(undefined)
    const format = importClipboardContent(content, dataSet)
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

  private isReadInProgress() {
    return this.readStartTime != null && Date.now() - this.readStartTime < kClipboardReadBusyMs
  }

  // Opens the paste dialog right away, then adds the permission note if the permission check reports
  // that reading is denied. The check runs afterwards so the dialog never waits on it.
  private async requestPaste(dataSet: Maybe<IDataSet>, pasteLog: IPendingPasteLog) {
    const request: IPasteRequest = { dataSet, permissionDenied: false }
    this.pendingPasteLog = pasteLog
    this.setPasteRequest(request)
    if (await isClipboardReadDenied() && this._pasteRequest === request) {
      this.setPasteRequest({ ...request, permissionDenied: true })
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

  private async tryWriteText(text: string) {
    try {
      if (!navigator.clipboard) return false
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  @action
  private setFailed(method: ClipboardWriteMethod) {
    if (method === "writeText") this.writeTextFailed = true
    else this.execCommandFailed = true
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
