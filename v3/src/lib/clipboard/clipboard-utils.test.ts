import {
  ClipboardUnavailableError, focusDocumentForClipboard, getReturnFocusTarget, isClipboardReadDenied, readClipboard,
  writeWithClipboardApi, writeWithExecCommand
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

  it("rejects with ClipboardUnavailableError when the Clipboard API is missing", async () => {
    setClipboard(undefined)
    await expect(readClipboard()).rejects.toBeInstanceOf(ClipboardUnavailableError)
  })

  it("rejects with ClipboardUnavailableError when the Clipboard API can't read", async () => {
    setClipboard({ writeText: jest.fn() })
    await expect(readClipboard()).rejects.toBeInstanceOf(ClipboardUnavailableError)
  })
})

describe("writeWithClipboardApi", () => {
  afterEach(() => {
    setClipboard(undefined)
  })

  it("writes the text and returns true on success", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    await expect(writeWithClipboardApi("a,b")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("a,b")
  })

  it("returns false when writeText rejects", async () => {
    setClipboard({ writeText: jest.fn().mockRejectedValue(new Error("blocked by permissions policy")) })
    await expect(writeWithClipboardApi("a,b")).resolves.toBe(false)
  })

  it("returns false when the Clipboard API is missing", async () => {
    setClipboard(undefined)
    await expect(writeWithClipboardApi("a,b")).resolves.toBe(false)
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

describe("getReturnFocusTarget", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("returns the button that opens the menu containing the focused item", () => {
    document.body.innerHTML = `
      <button id="menu-button">Tables</button>
      <div role="menu" aria-labelledby="menu-button"><button role="menuitem" id="item">Import</button></div>`
    document.getElementById("item")?.focus()
    expect(getReturnFocusTarget()).toBe(document.getElementById("menu-button"))
  })

  it("returns the button whose aria-controls names the menu containing the focused item", () => {
    document.body.innerHTML = `
      <button id="menu-button" aria-controls="the-menu">Tables</button>
      <div role="menu" id="the-menu"><button role="menuitem" id="item">Import</button></div>`
    document.getElementById("item")?.focus()
    expect(getReturnFocusTarget()).toBe(document.getElementById("menu-button"))
  })

  it("returns the focused element when it isn't in a menu", () => {
    document.body.innerHTML = `<button id="plain">Plain</button>`
    document.getElementById("plain")?.focus()
    expect(getReturnFocusTarget()).toBe(document.getElementById("plain"))
  })

  it("returns the focused item when its menu has no labelling button", () => {
    document.body.innerHTML = `<div role="menu"><button role="menuitem" id="item">Import</button></div>`
    document.getElementById("item")?.focus()
    expect(getReturnFocusTarget()).toBe(document.getElementById("item"))
  })

  it("returns undefined when nothing has focus", () => {
    expect(getReturnFocusTarget()).toBeUndefined()
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
