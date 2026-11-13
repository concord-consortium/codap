import { destroy } from "mobx-state-tree"
import { DataSet } from "../../models/data/data-set"
import { importClipboardContent } from "../../utilities/clipboard-import"
import { Logger } from "../logger"
import { clipboardManager } from "./clipboard-manager"
import { focusDocumentForClipboard, isClipboardReadDenied, readClipboard } from "./clipboard-utils"

jest.mock("./clipboard-utils", () => ({
  ...jest.requireActual("./clipboard-utils"),
  focusDocumentForClipboard: jest.fn(),
  isClipboardReadDenied: jest.fn(),
  readClipboard: jest.fn()
}))

jest.mock("../../utilities/clipboard-import", () => ({
  ...jest.requireActual("../../utilities/clipboard-import"),
  importClipboardContent: jest.fn()
}))

const mockFocus = focusDocumentForClipboard as jest.Mock
const mockIsDenied = isClipboardReadDenied as jest.Mock
const mockReadClipboard = readClipboard as jest.Mock
const mockImportContent = importClipboardContent as jest.Mock

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

describe("ClipboardManager import", () => {
  const tableContent = { html: "<table><tr><td>1</td></tr></table>", text: "1" }
  const dataSet = DataSet.create({ name: "existing" })
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    clipboardManager.reset()
    logSpy = jest.spyOn(Logger, "log").mockImplementation(() => null)
    mockFocus.mockReset()
    mockIsDenied.mockReset().mockResolvedValue(false)
    mockReadClipboard.mockReset()
    mockImportContent.mockReset()
      .mockImplementation(content => content.html ? "html" : content.text ? "csv" : undefined)
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  async function failRead(denied = false) {
    mockIsDenied.mockResolvedValue(denied)
    mockReadClipboard.mockRejectedValue(new Error("Document is not focused"))
    await clipboardManager.importData(dataSet)
  }

  it("imports content read from the clipboard", async () => {
    mockReadClipboard.mockResolvedValue({ method: "read", content: tableContent })
    await clipboardManager.importData(dataSet)
    expect(mockImportContent).toHaveBeenCalledWith(tableContent, dataSet)
    expect(clipboardManager.pasteRequest).toBeUndefined()
    expect(logSpy.mock.calls[0][2]).toBe("data")
    expect(lastLogArgs(logSpy)).toEqual({
      method: "read", failed: "", skipped: "", outcome: "imported", format: "html", permissionDenied: false
    })
  })

  it("focuses the document before reading", async () => {
    mockReadClipboard.mockImplementation(() => {
      expect(mockFocus).toHaveBeenCalled()
      return Promise.resolve({ method: "readText", content: { text: "a" } })
    })
    await clipboardManager.importData()
    expect(mockReadClipboard).toHaveBeenCalled()
  })

  it("shows a message for an empty clipboard without remembering a failure", async () => {
    mockReadClipboard.mockResolvedValue({ method: "read", content: {} })
    await clipboardManager.importData(dataSet)
    expect(clipboardManager.message).toEqual({ kind: "emptyClipboard" })
    expect(clipboardManager.pasteRequest).toBeUndefined()
    expect(lastLogArgs(logSpy)).toEqual({
      method: "read", failed: "", skipped: "", outcome: "empty", format: "", permissionDenied: false
    })

    mockReadClipboard.mockClear()
    await clipboardManager.importData(dataSet)
    expect(mockReadClipboard).toHaveBeenCalled()
  })

  it("requests the paste dialog when the read fails", async () => {
    await failRead(true)
    expect(clipboardManager.pasteRequest).toEqual({ dataSet, permissionDenied: true })
    expect(mockImportContent).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
  })

  it("imports pasted data into the requested dataset and logs it", async () => {
    await failRead(true)
    clipboardManager.importPastedData({ text: "a,b\n1,2" })
    expect(mockImportContent).toHaveBeenCalledWith({ text: "a,b\n1,2" }, dataSet)
    expect(clipboardManager.pasteRequest).toBeUndefined()
    expect(lastLogArgs(logSpy)).toEqual({
      method: "paste", failed: "read", skipped: "", outcome: "imported", format: "csv", permissionDenied: true
    })
  })

  it("goes straight to the paste dialog once reading has failed", async () => {
    await failRead()
    clipboardManager.cancelPaste()
    mockReadClipboard.mockClear()

    await clipboardManager.importData(dataSet)
    expect(mockReadClipboard).not.toHaveBeenCalled()
    expect(clipboardManager.pasteRequest).toEqual({ dataSet, permissionDenied: false })

    clipboardManager.cancelPaste()
    expect(clipboardManager.pasteRequest).toBeUndefined()
    expect(mockImportContent).not.toHaveBeenCalled()
    expect(lastLogArgs(logSpy)).toEqual({
      method: "paste", failed: "", skipped: "read", outcome: "cancelled", format: "", permissionDenied: false
    })
  })

  it("ignores another import while the paste dialog is open", async () => {
    await failRead()
    mockReadClipboard.mockClear()
    const otherDataSet = DataSet.create({ name: "other" })

    await clipboardManager.importData(otherDataSet)
    expect(clipboardManager.pasteRequest).toEqual({ dataSet, permissionDenied: false })
    expect(mockReadClipboard).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
  })

  it("doesn't treat an import error after a successful read as a read failure", async () => {
    mockReadClipboard.mockResolvedValue({ method: "read", content: tableContent })
    mockImportContent.mockImplementationOnce(() => { throw new Error("import bug") })
    await expect(clipboardManager.importData(dataSet)).rejects.toThrow("import bug")
    expect(clipboardManager.pasteRequest).toBeUndefined()

    mockReadClipboard.mockClear()
    await clipboardManager.importData(dataSet)
    expect(mockReadClipboard).toHaveBeenCalled()
    expect(clipboardManager.pasteRequest).toBeUndefined()
  })

  it("ignores another import while a read is still in progress", async () => {
    let resolveRead: (value: unknown) => void = () => null
    mockReadClipboard.mockImplementation(() => new Promise(resolve => { resolveRead = resolve }))
    const first = clipboardManager.importData(dataSet)
    await clipboardManager.importData(dataSet)
    resolveRead({ method: "read", content: tableContent })
    await first
    expect(mockReadClipboard).toHaveBeenCalledTimes(1)
    expect(mockImportContent).toHaveBeenCalledTimes(1)
  })

  it("imports into a new dataset if the requested dataset was destroyed", async () => {
    const realDataSet = DataSet.create({ name: "doomed" })
    mockReadClipboard.mockRejectedValue(new Error("denied"))
    await clipboardManager.importData(realDataSet)
    destroy(realDataSet)

    clipboardManager.importPastedData({ text: "a,b" })
    expect(mockImportContent).toHaveBeenCalledWith({ text: "a,b" }, undefined)
  })

  it("never logs the imported content", async () => {
    mockReadClipboard.mockResolvedValue({ method: "read", content: { text: "secret,data" } })
    await clipboardManager.importData()
    await failRead()
    clipboardManager.importPastedData({ text: "secret,paste" })
    for (const call of logSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("secret")
    }
  })
})
