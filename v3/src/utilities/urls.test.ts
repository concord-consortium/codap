import { getExtensionFromUrl, safeParseUrl } from "./urls"

describe("urls", () => {
  describe("safeParseUrl", () => {
    it("parses absolute URLs", () => {
      const url = safeParseUrl("https://example.com/path/file.html")
      expect(url?.origin).toBe("https://example.com")
      expect(url?.pathname).toBe("/path/file.html")
    })

    it("resolves relative URLs against window.location.origin", () => {
      // In Jest/jsdom, window.location.origin is "http://localhost"
      const url = safeParseUrl("/codap-resources/plugins/Foo/index.html")
      expect(url?.origin).toBe("http://localhost")
      expect(url?.pathname).toBe("/codap-resources/plugins/Foo/index.html")
    })

    it("returns undefined for empty string", () => {
      expect(safeParseUrl("")).toBeUndefined()
    })

    it("handles data: URLs", () => {
      const url = safeParseUrl("data:image/png;base64,abc123")
      expect(url?.protocol).toBe("data:")
    })

    it("resolves relative paths without leading slash", () => {
      const url = safeParseUrl("plugins/Foo/index.html")
      expect(url?.pathname).toContain("plugins/Foo/index.html")
    })
  })

  describe("getExtensionFromUrl", () => {
    it("returns the extension for a URL with an extension", () => {
      expect(getExtensionFromUrl("http://example.com/file.csv")).toBe("csv")
      expect(getExtensionFromUrl("https://example.com/path/to/file.JSON")).toBe("json")
      expect(getExtensionFromUrl("https://example.com/path.to/file.geojson")).toBe("geojson")
    })

    it("returns undefined for a URL without an extension", () => {
      expect(getExtensionFromUrl("http://example.com/file")).toBeUndefined()
      expect(getExtensionFromUrl("https://example.com/path/to/file/")).toBeUndefined()
      expect(getExtensionFromUrl("https://example.com/")).toBeUndefined()
    })

    it("returns undefined for an invalid URL", () => {
      expect(getExtensionFromUrl("not-a-url")).toBeUndefined()
    })
  })
})
