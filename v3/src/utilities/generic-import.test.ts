import { getWebViewSnapshotState } from "./generic-import"

describe("Generic import", () => {
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
