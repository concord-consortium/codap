// Low-level wrappers around the browser's clipboard APIs. Callers are expected to catch rejections;
// the ClipboardManager is the only intended caller.

export type ClipboardReadMethod = "read" | "readText"
export type ClipboardWriteMethod = "writeText" | "execCommand"

export interface IClipboardContent {
  html?: string
  text?: string
}

export interface IClipboardReadResult {
  method: ClipboardReadMethod
  content: IClipboardContent
}

// Reading the clipboard fails with "Document is not focused" when focus is elsewhere (e.g. in an iframe).
// V2 focused the window and blurred the active element before reading; we do the same.
// Returns the element focus should return to after a clipboard dialog closes. When the focused element is
// an item in a menu, that's the button that opens the menu (which a menu's aria-labelledby identifies),
// since the item itself disappears when the menu closes.
export function getReturnFocusTarget(): Maybe<HTMLElement> {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || active === document.body) return
  const buttonId = active.closest("[role='menu']")?.getAttribute("aria-labelledby")
  const menuButton = buttonId ? document.getElementById(buttonId) : null
  return menuButton ?? active
}

export function focusDocumentForClipboard() {
  window.focus()
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

// Makes exactly one clipboard read call. A second call would mean a second iOS Paste callout and more time
// spent outside user activation. Rejects if the read fails or the Clipboard API is missing.
export async function readClipboard(): Promise<IClipboardReadResult> {
  const clipboard = navigator.clipboard
  if (!clipboard) throw new Error("Clipboard API is not available")

  if (typeof clipboard.read === "function") {
    const content: IClipboardContent = {}
    const items = await clipboard.read()
    for (const item of items) {
      if (content.html == null && item.types.includes("text/html")) {
        content.html = await (await item.getType("text/html")).text()
      }
      if (content.text == null && item.types.includes("text/plain")) {
        content.text = await (await item.getType("text/plain")).text()
      }
    }
    return { method: "read", content }
  }

  return { method: "readText", content: { text: await clipboard.readText() } }
}

// The legacy copy fallback that V2 used when `navigator.clipboard.write()` failed.
// Returns true only if the browser reports that the copy succeeded.
// Copies text with the Clipboard API. Resolves false, rather than rejecting, if the API is missing or the
// browser refuses the write.
export async function writeWithClipboardApi(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function writeWithExecCommand(text: string): boolean {
  const handleCopy = (e: ClipboardEvent) => {
    e.clipboardData?.setData("text/plain", text)
    e.preventDefault()
  }
  document.addEventListener("copy", handleCopy)
  try {
    return typeof document.execCommand === "function" && document.execCommand("copy") === true
  } catch {
    return false
  } finally {
    document.removeEventListener("copy", handleCopy)
  }
}

// True only when the browser reports that clipboard reading is denied for this site. Firefox doesn't
// support querying "clipboard-read" (the query throws), and some browsers lack the Permissions API.
export async function isClipboardReadDenied(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "clipboard-read" as PermissionName })
    return status?.state === "denied"
  } catch {
    return false
  }
}
