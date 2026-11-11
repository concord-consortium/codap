import { isAlive } from "@concord-consortium/mobx-state-tree"
import { action, makeObservable, observable } from "mobx"
import { IDataSet } from "../../models/data/data-set"
import { ClipboardImportFormat, importClipboardContent } from "../../utilities/clipboard-import"
import { Logger } from "../logger"
import { LoggableObject, logStringifiedObjectMessage } from "../log-message"
import {
  ClipboardReadMethod, focusDocumentForClipboard, IClipboardContent, isClipboardReadDenied, readClipboard,
  writeWithExecCommand
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

export type ClipboardMessage =
  { kind: "copied", description: string } | { kind: "copyUnavailable" } | { kind: "emptyClipboard" }

/**
 * Owns all clipboard access for CODAP. Browsers can refuse the Clipboard API for reasons the user can't
 * fix (an iframe without clipboard permissions, lost focus or user activation, a dismissed iOS Paste
 * callout), so each operation falls back to an alternative, and failures are remembered for the rest of
 * the page session so the user doesn't wait on an attempt that's known to fail.
 *
 * The manager never renders anything. It exposes observable state describing what the UI should show,
 * which the app-level ClipboardHost renders. No method ever rejects.
 */
export class ClipboardManager {
  @observable private writeTextFailed = false
  @observable private execCommandFailed = false
  @observable private readFailed = false
  @observable.ref private _message: Maybe<ClipboardMessage> = undefined
  @observable.ref private _pasteRequest: Maybe<IPasteRequest> = undefined
  private pendingPasteLog: Maybe<IPendingPasteLog>
  private isReading = false

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
    this.isReading = false
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
    this.log("Copy to clipboard: %@", {
      method: method ?? "none",
      failed: failed.join(","),
      skipped: skipped.join(","),
      outcome: method ? "copied" : "unavailable"
    })
    return !!method
  }

  // Imports clipboard data into `dataSet`, or into a new dataset if none is given. If the clipboard can't be
  // read, requests the paste dialog instead. Ignored while a read or the paste dialog is already in progress.
  async importData(dataSet?: IDataSet): Promise<void> {
    if (this.isReading || this._pasteRequest) return

    if (this.readFailed) {
      this.pendingPasteLog = { failed: "", skipped: "read" }
      this.setPasteRequest({ dataSet, permissionDenied: await isClipboardReadDenied() })
      return
    }

    this.isReading = true
    try {
      focusDocumentForClipboard()
      const { method, content } = await readClipboard()
      const format = importClipboardContent(content, dataSet)
      if (!format) this.setMessage({ kind: "emptyClipboard" })
      this.logImport(method, format ? "imported" : "empty", { format })
    } catch {
      this.setReadFailed()
      this.pendingPasteLog = { failed: "read", skipped: "" }
      this.setPasteRequest({ dataSet, permissionDenied: await isClipboardReadDenied() })
    } finally {
      this.isReading = false
    }
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

  private logImport(method: ClipboardImportMethod, outcome: ClipboardImportOutcome,
                    options: { format?: ClipboardImportFormat, failed?: string, skipped?: string },
                    request?: IPasteRequest) {
    this.log("Import from clipboard: %@", {
      method,
      failed: options.failed ?? "",
      skipped: options.skipped ?? "",
      outcome,
      format: options.format ?? "",
      permissionDenied: request?.permissionDenied ?? false
    })
  }

  private log(event: string, logArgs: LoggableObject) {
    const { message, args, category } = logStringifiedObjectMessage(event, logArgs, "data")
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
