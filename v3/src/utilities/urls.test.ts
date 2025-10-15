import { getExtensionFromUrl } from "./urls"

describe("urls", () => {
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
