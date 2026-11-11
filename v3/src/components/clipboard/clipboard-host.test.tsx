import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { clipboardManager } from "../../lib/clipboard/clipboard-manager"
import { Logger } from "../../lib/logger"
import { ClipboardHost } from "./clipboard-host"

describe("ClipboardHost", () => {
  const originalExecCommand = document.execCommand
  let logSpy: jest.SpyInstance
  let focusSpy: jest.SpyInstance

  function setClipboard(clipboard: Partial<Clipboard> | undefined) {
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true, writable: true })
  }

  beforeEach(() => {
    clipboardManager.reset()
    logSpy = jest.spyOn(Logger, "log").mockImplementation(() => null)
    // jsdom doesn't implement window.focus(), which the manager calls before reading
    focusSpy = jest.spyOn(window, "focus").mockImplementation(() => null)
  })

  afterEach(() => {
    logSpy.mockRestore()
    focusSpy.mockRestore()
    setClipboard(undefined)
    document.execCommand = originalExecCommand
    act(() => clipboardManager.reset())
  })

  it("renders nothing when there's no message or paste request", () => {
    render(<ClipboardHost />)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows the copied message and closes it with OK", async () => {
    const user = userEvent.setup()
    setClipboard({ writeText: jest.fn().mockResolvedValue(undefined) })
    render(<ClipboardHost />)
    await act(() => clipboardManager.copyText("a,b", "27 Cases"))
    expect(screen.getByText("Copied 27 Cases to the clipboard")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "OK" }))
    expect(clipboardManager.message).toBeUndefined()
  })

  it("shows the copy-unavailable message", async () => {
    setClipboard({ writeText: jest.fn().mockRejectedValue(new Error("blocked")) })
    document.execCommand = jest.fn(() => false)
    render(<ClipboardHost />)
    await act(() => clipboardManager.copyText("a,b", "27 Cases"))
    expect(screen.getByText("Copying to the clipboard failed. You can use Export Case Data... instead."))
      .toBeInTheDocument()
  })

  it("shows the empty-clipboard message", async () => {
    setClipboard({ readText: jest.fn().mockResolvedValue("  ") })
    render(<ClipboardHost />)
    await act(() => clipboardManager.importData())
    expect(screen.getByText("The clipboard doesn't contain any data to import.")).toBeInTheDocument()
  })

  it("shows the paste dialog when reading fails, and Cancel closes it", async () => {
    const user = userEvent.setup()
    setClipboard({ readText: jest.fn().mockRejectedValue(new Error("Document is not focused")) })
    render(<ClipboardHost />)
    await act(() => clipboardManager.importData())
    expect(clipboardManager.pasteRequest).toBeDefined()
    expect(screen.getByText("Reading from the clipboard failed. Paste your data here:")).toBeInTheDocument()
    expect(screen.queryByText(/blocking clipboard access/)).not.toBeInTheDocument()

    await user.click(screen.getByTestId("paste-data-cancel-button"))
    expect(clipboardManager.pasteRequest).toBeUndefined()
  })

  it("passes pasted data to the manager on Import", async () => {
    const user = userEvent.setup()
    setClipboard({ readText: jest.fn().mockRejectedValue(new Error("denied")) })
    const importSpy = jest.spyOn(clipboardManager, "importPastedData").mockImplementation(() => null)
    render(<ClipboardHost />)
    await act(() => clipboardManager.importData())
    await user.type(screen.getByTestId("paste-data-text-area"), "a,b")
    await user.click(screen.getByTestId("paste-data-import-button"))
    expect(importSpy).toHaveBeenCalledWith({ text: "a,b" })
    importSpy.mockRestore()
  })
})
