import { getWebViewSnapshotState, isGenericallyImportableUrl } from "./generic-import"

describe("Generic import", () => {
  describe("isGenericallyImportableUrl", () => {
    it("correctly identifies importable URLs", () => {
      const testCases: Array<{ url: string; expected: false | { url: string; contentType: string } }> = [
        {
          url: "http://example.com/data.geojson",
          expected: { url: "http://example.com/data.geojson", contentType: "application/geo+json" },
        },
        {
          url: "https://example.com/path/to/file.GEOJSON",
          expected: { url: "https://example.com/path/to/file.GEOJSON", contentType: "application/geo+json" },
        },
        {
          url: "http://example.com/data.json",
          expected: false,
        },
        {
          url: "http://example.com/data.csv",
          expected: false,
        },
        {
          url: "http://example.com/data",
          expected: false,
        },
      ]

      for (const { url, expected } of testCases) {
        expect(isGenericallyImportableUrl(url)).toEqual(expected)
      }
    })
  })

  describe("getWebViewSnapshotState", () => {
    it("generates the correct WebView snapshot state for file imports", () => {
      const options = {
        file: new File([""], "test.geojson"),
      }
      const state = getWebViewSnapshotState(options)
      expect(state).toEqual({
        name: "Importer",
        datasetName: "test",
        file: options.file,
        url: undefined
      })
    })

    it("generates the correct WebView snapshot state for URL imports", () => {
      const options = {
        url: "http://example.com/test.geojson",
      }
      const state = getWebViewSnapshotState(options)
      expect(state).toEqual({
        name: "Importer",
        datasetName: "test",
        file: undefined,
        url: options.url
      })
    })

    it("generates an undefined datasetName when the url ends in slash", () => {
      const options = {
        url: "http://example.com/geojson-example/",
      }
      const state = getWebViewSnapshotState(options)
      expect(state).toEqual({
        name: "Importer",
        datasetName: undefined,
        file: undefined,
        url: options.url
      })
    })

    it("adds the optional contentType to the WebView snapshot state", () => {
      const options = {
        file: new File([""], "test.geojson"),
        contentType: "application/geo+json"
      }
      const state = getWebViewSnapshotState(options)
      expect(state).toEqual({
        contentType: "application/geo+json",
        name: "Importer",
        datasetName: "test",
        file: options.file,
        url: undefined
      })
    })
  })
})
