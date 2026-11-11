import { action, makeObservable, observable } from "mobx"
import { Logger } from "../logger"
import { logStringifiedObjectMessage } from "../log-message"
import { writeWithExecCommand } from "./clipboard-utils"

type ClipboardWriteMethod = "writeText" | "execCommand"

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
  @observable.ref private _message: Maybe<ClipboardMessage> = undefined

  constructor() {
    makeObservable(this)
  }

  get message() {
    return this._message
  }

  @action
  closeMessage() {
    this._message = undefined
  }

  @action
  reset() {
    this.writeTextFailed = false
    this.execCommandFailed = false
    this._message = undefined
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
    const { message, args, category } = logStringifiedObjectMessage("Copy to clipboard: %@", {
      method: method ?? "none",
      failed: failed.join(","),
      skipped: skipped.join(","),
      outcome: method ? "copied" : "unavailable"
    }, "data")
    Logger.log(message, args, category)
    return !!method
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
  private setMessage(message: ClipboardMessage) {
    this._message = message
  }
}

export const clipboardManager = new ClipboardManager()
