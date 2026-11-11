import { Logger } from "../logger"
import { clipboardManager } from "./clipboard-manager"

function setClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true, writable: true })
}

function lastLogArgs(logSpy: jest.SpyInstance) {
  return logSpy.mock.calls[logSpy.mock.calls.length - 1][1]
}

describe("ClipboardManager copy", () => {
  const originalExecCommand = document.execCommand
  let logSpy: jest.SpyInstance
  let writeText: jest.Mock
  let execCommand: jest.Mock

  beforeEach(() => {
    clipboardManager.reset()
    logSpy = jest.spyOn(Logger, "log").mockImplementation(() => null)
    writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    execCommand = jest.fn(() => true)
    document.execCommand = execCommand
  })

  afterEach(() => {
    logSpy.mockRestore()
    setClipboard(undefined)
    document.execCommand = originalExecCommand
  })

  it("copies with writeText() and reports success", async () => {
    await expect(clipboardManager.copyText("a,b", "27 Cases")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("a,b")
    expect(execCommand).not.toHaveBeenCalled()
    expect(clipboardManager.message).toEqual({ kind: "copied", description: "27 Cases" })
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0][2]).toBe("data")
    expect(lastLogArgs(logSpy)).toEqual({ method: "writeText", failed: "", skipped: "", outcome: "copied" })
  })

  it("falls back to execCommand() when writeText() rejects", async () => {
    writeText.mockRejectedValue(new Error("blocked by permissions policy"))
    await expect(clipboardManager.copyText("a,b", "27 Cases")).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(clipboardManager.message).toEqual({ kind: "copied", description: "27 Cases" })
    expect(lastLogArgs(logSpy))
      .toEqual({ method: "execCommand", failed: "writeText", skipped: "", outcome: "copied" })
  })

  it("treats a missing Clipboard API as a writeText() failure", async () => {
    setClipboard(undefined)
    await expect(clipboardManager.copyText("a,b", "27 Cases")).resolves.toBe(true)
    expect(lastLogArgs(logSpy))
      .toEqual({ method: "execCommand", failed: "writeText", skipped: "", outcome: "copied" })
  })

  it("skips writeText() on later copies once it has failed", async () => {
    writeText.mockRejectedValue(new Error("blocked"))
    await clipboardManager.copyText("a,b", "27 Cases")
    writeText.mockClear()

    await expect(clipboardManager.copyText("c,d", "4 Tracks")).resolves.toBe(true)
    expect(writeText).not.toHaveBeenCalled()
    expect(lastLogArgs(logSpy))
      .toEqual({ method: "execCommand", failed: "", skipped: "writeText", outcome: "copied" })
  })

  it("reports copy unavailable when both methods fail", async () => {
    writeText.mockRejectedValue(new Error("blocked"))
    execCommand.mockReturnValue(false)
    await expect(clipboardManager.copyText("a,b", "27 Cases")).resolves.toBe(false)
    expect(clipboardManager.message).toEqual({ kind: "copyUnavailable" })
    expect(lastLogArgs(logSpy))
      .toEqual({ method: "none", failed: "writeText,execCommand", skipped: "", outcome: "unavailable" })
  })

  it("tries nothing on later copies once both methods have failed", async () => {
    writeText.mockRejectedValue(new Error("blocked"))
    execCommand.mockReturnValue(false)
    await clipboardManager.copyText("a,b", "27 Cases")
    writeText.mockClear()
    execCommand.mockClear()
    clipboardManager.closeMessage()

    await expect(clipboardManager.copyText("c,d", "4 Tracks")).resolves.toBe(false)
    expect(writeText).not.toHaveBeenCalled()
    expect(execCommand).not.toHaveBeenCalled()
    expect(clipboardManager.message).toEqual({ kind: "copyUnavailable" })
    expect(lastLogArgs(logSpy))
      .toEqual({ method: "none", failed: "", skipped: "writeText,execCommand", outcome: "unavailable" })
  })

  it("never logs the copied text", async () => {
    const secret = "secret,data\n1,2"
    await clipboardManager.copyText(secret, "1 Case")
    writeText.mockRejectedValue(new Error("blocked"))
    execCommand.mockReturnValue(false)
    await clipboardManager.copyText(secret, "1 Case")
    for (const call of logSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("secret")
    }
  })

  it("clears the message when closed", async () => {
    await clipboardManager.copyText("a,b", "27 Cases")
    clipboardManager.closeMessage()
    expect(clipboardManager.message).toBeUndefined()
  })
})
