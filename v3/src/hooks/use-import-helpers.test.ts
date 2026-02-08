import { getDropPriority } from "./use-import-helpers"

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
