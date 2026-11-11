import {
  focusDocumentForClipboard, isClipboardReadDenied, readClipboard, writeWithExecCommand
} from "./clipboard-utils"

function mockBlob(content: string) {
  return { text: () => Promise.resolve(content) }
}

function mockClipboardItem(contents: Record<string, string>) {
  return {
    types: Object.keys(contents),
    getType: jest.fn((type: string) => Promise.resolve(mockBlob(contents[type])))
  }
}

function setClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true, writable: true })
}

function setPermissions(permissions: Partial<Permissions> | undefined) {
  Object.defineProperty(navigator, "permissions", { value: permissions, configurable: true, writable: true })
}

describe("readClipboard", () => {
  afterEach(() => setClipboard(undefined))

  it("makes a single read() call and returns its html and text", async () => {
    const readText = jest.fn()
    setClipboard({
      read: jest.fn().mockResolvedValue([mockClipboardItem({ "text/html": "<table></table>", "text/plain": "1" })]),
      readText
    })
    await expect(readClipboard()).resolves.toEqual({
      method: "read", content: { html: "<table></table>", text: "1" }
    })
    expect(readText).not.toHaveBeenCalled()
  })

  it("returns empty content when read() finds no text types", async () => {
    setClipboard({ read: jest.fn().mockResolvedValue([mockClipboardItem({ "image/png": "png" })]) })
    await expect(readClipboard()).resolves.toEqual({ method: "read", content: {} })
  })

  it("uses readText() when read() is unavailable", async () => {
    setClipboard({ readText: jest.fn().mockResolvedValue("a,b") })
    await expect(readClipboard()).resolves.toEqual({ method: "readText", content: { text: "a,b" } })
  })

  it("rejects without calling readText() when read() rejects", async () => {
    const readText = jest.fn()
    setClipboard({ read: jest.fn().mockRejectedValue(new Error("denied")), readText })
    await expect(readClipboard()).rejects.toThrow("denied")
    expect(readText).not.toHaveBeenCalled()
  })

  it("rejects when the Clipboard API is missing", async () => {
    setClipboard(undefined)
    await expect(readClipboard()).rejects.toThrow()
  })
})

describe("writeWithExecCommand", () => {
  const originalExecCommand = document.execCommand

  afterEach(() => {
    document.execCommand = originalExecCommand
  })

  function mockExecCommand(impl: () => boolean) {
    const setData = jest.fn()
    const preventDefault = jest.fn()
    document.execCommand = jest.fn(() => {
      const event = new Event("copy") as ClipboardEvent
      Object.assign(event, { clipboardData: { setData }, preventDefault })
      document.dispatchEvent(event)
      return impl()
    })
    return { setData, preventDefault }
  }

  it("copies the text via a copy event and returns true on success", () => {
    const { setData, preventDefault } = mockExecCommand(() => true)
    expect(writeWithExecCommand("a,b")).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith("copy")
    expect(setData).toHaveBeenCalledWith("text/plain", "a,b")
    expect(preventDefault).toHaveBeenCalled()
  })

  it("returns false when execCommand returns false", () => {
    mockExecCommand(() => false)
    expect(writeWithExecCommand("a,b")).toBe(false)
  })

  it("returns false when execCommand throws", () => {
    mockExecCommand(() => { throw new Error("nope") })
    expect(writeWithExecCommand("a,b")).toBe(false)
  })

  it("returns false when execCommand is missing", () => {
    document.execCommand = undefined as any
    expect(writeWithExecCommand("a,b")).toBe(false)
  })

  it("removes its copy listener afterwards", () => {
    const { setData } = mockExecCommand(() => true)
    writeWithExecCommand("a,b")
    setData.mockClear()
    const event = new Event("copy") as ClipboardEvent
    Object.assign(event, { clipboardData: { setData }, preventDefault: jest.fn() })
    document.dispatchEvent(event)
    expect(setData).not.toHaveBeenCalled()
  })
})

describe("isClipboardReadDenied", () => {
  afterEach(() => setPermissions(undefined))

  it("returns true when the permission is denied", async () => {
    setPermissions({ query: jest.fn().mockResolvedValue({ state: "denied" }) })
    await expect(isClipboardReadDenied()).resolves.toBe(true)
  })

  it.each(["prompt", "granted"])("returns false when the permission is %s", async state => {
    setPermissions({ query: jest.fn().mockResolvedValue({ state }) })
    await expect(isClipboardReadDenied()).resolves.toBe(false)
  })

  it("returns false when the query rejects (e.g. Firefox)", async () => {
    setPermissions({ query: jest.fn().mockRejectedValue(new TypeError("unsupported")) })
    await expect(isClipboardReadDenied()).resolves.toBe(false)
  })

  it("returns false when the Permissions API is missing", async () => {
    setPermissions(undefined)
    await expect(isClipboardReadDenied()).resolves.toBe(false)
  })
})

describe("focusDocumentForClipboard", () => {
  it("focuses the window and blurs the active element", () => {
    const focusSpy = jest.spyOn(window, "focus").mockImplementation(() => null)
    const input = document.createElement("input")
    document.body.appendChild(input)
    input.focus()
    expect(document.activeElement).toBe(input)

    focusDocumentForClipboard()

    expect(focusSpy).toHaveBeenCalled()
    expect(document.activeElement).not.toBe(input)
    input.remove()
    focusSpy.mockRestore()
  })
})
