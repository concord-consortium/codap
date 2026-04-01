import { extractOrigin } from "./use-data-interactive-controller"

describe("extractOrigin", () => {
  it("extracts origin from absolute https URLs", () => {
    expect(extractOrigin("https://codap-resources.concord.org/plugins/Foo/index.html"))
      .toBe("https://codap-resources.concord.org")
  })

  it("extracts origin from absolute http URLs", () => {
    expect(extractOrigin("http://example.com/page.html"))
      .toBe("http://example.com")
  })

  it("resolves relative URLs against window.location.origin", () => {
    // In Jest/jsdom, window.location.origin is "http://localhost"
    expect(extractOrigin("/codap-resources/plugins/Foo/index.html"))
      .toBe("http://localhost")
  })

  it("resolves relative paths without leading slash", () => {
    expect(extractOrigin("codap-resources/plugins/Foo/index.html"))
      .toBe("http://localhost")
  })

  it("returns undefined for undefined input", () => {
    expect(extractOrigin(undefined)).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    expect(extractOrigin("")).toBeUndefined()
  })

  it("handles data: URLs", () => {
    expect(extractOrigin("data:image/png;base64,abc123"))
      .toBe("null")
  })
})
