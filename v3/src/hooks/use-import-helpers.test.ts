import { renderHook } from "@testing-library/react"
import { kWebViewTileType } from "../components/web-view/web-view-defs"
import { appState } from "../models/app-state"
import { getDropPriority, useImportHelpers } from "./use-import-helpers"

// Helper to create a mock DataTransferItemList from an array of {kind, type} objects
function mockItems(items: Array<{ kind: string, type: string }>): DataTransferItemList {
  const list: any = {
    length: items.length,
    ...Object.fromEntries(items.map((item, i) => [i, item]))
  }
  return list
}

describe("getDropPriority", () => {
  it("returns 'files' when file items are present", () => {
    const items = mockItems([
      { kind: "file", type: "text/csv" }
    ])
    expect(getDropPriority(items)).toBe("files")
  })

  it("returns 'files' when both file and HTML items are present", () => {
    const items = mockItems([
      { kind: "file", type: "text/csv" },
      { kind: "string", type: "text/html" }
    ])
    expect(getDropPriority(items)).toBe("files")
  })

  it("returns 'files' when file, URL, and HTML items are all present", () => {
    const items = mockItems([
      { kind: "file", type: "application/json" },
      { kind: "string", type: "text/uri-list" },
      { kind: "string", type: "text/html" }
    ])
    expect(getDropPriority(items)).toBe("files")
  })

  it("returns 'url' when URL items are present without files", () => {
    const items = mockItems([
      { kind: "string", type: "text/uri-list" }
    ])
    expect(getDropPriority(items)).toBe("url")
  })

  it("returns 'url' when both URL and HTML items are present (no files)", () => {
    const items = mockItems([
      { kind: "string", type: "text/uri-list" },
      { kind: "string", type: "text/html" },
      { kind: "string", type: "text/plain" }
    ])
    expect(getDropPriority(items)).toBe("url")
  })

  it("returns 'html' when only HTML items are present", () => {
    const items = mockItems([
      { kind: "string", type: "text/html" }
    ])
    expect(getDropPriority(items)).toBe("html")
  })

  it("returns 'html' when HTML and plain text items are present (typical web page drag)", () => {
    const items = mockItems([
      { kind: "string", type: "text/html" },
      { kind: "string", type: "text/plain" }
    ])
    expect(getDropPriority(items)).toBe("html")
  })

  it("returns 'none' when only plain text items are present", () => {
    const items = mockItems([
      { kind: "string", type: "text/plain" }
    ])
    expect(getDropPriority(items)).toBe("none")
  })

  it("returns 'none' for an empty items list", () => {
    const items = mockItems([])
    expect(getDropPriority(items)).toBe("none")
  })
})

describe("useImportHelpers loadWebView URL scheme guard", () => {
  const renderImportHelpers = () =>
    renderHook(() => useImportHelpers({ cfmRef: { current: null }, onCloseUserEntry: () => undefined }))

  it("alerts and does not create a web view for an unsafe-scheme dropped URL", () => {
    const alertSpy = jest.spyOn(appState, "alert").mockImplementation(() => undefined)
    const createSpy = jest.spyOn(appState.document.content!, "createOrShowTile")
      .mockImplementation(() => undefined)
    const { result } = renderImportHelpers()

    result.current.handleUrlImported("javascript:alert(1)")

    expect(alertSpy).toHaveBeenCalled()
    expect(createSpy).not.toHaveBeenCalled()

    createSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it("creates a web view for a supported-scheme dropped URL", () => {
    const alertSpy = jest.spyOn(appState, "alert").mockImplementation(() => undefined)
    const createSpy = jest.spyOn(appState.document.content!, "createOrShowTile")
      .mockImplementation(() => undefined)
    const { result } = renderImportHelpers()

    result.current.handleUrlImported("https://example.com/plugin/index")

    expect(createSpy).toHaveBeenCalledWith(kWebViewTileType, undefined)
    expect(alertSpy).not.toHaveBeenCalled()

    createSpy.mockRestore()
    alertSpy.mockRestore()
  })
})
