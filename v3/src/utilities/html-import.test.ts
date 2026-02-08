import { initiateImportFromHTML } from "./html-import"

const mockInsertTileSnapshotInDefaultRow = jest.fn()

jest.mock("../models/app-state", () => ({
  appState: {
    document: {
      content: {
        insertTileSnapshotInDefaultRow: (...args: any[]) => mockInsertTileSnapshotInDefaultRow(...args)
      }
    }
  }
}))

jest.mock("../constants", () => ({
  getImporterPluginUrl: () => "https://codap-resources.concord.org/plugins/Importer/index.html?lang=en-US"
}))

describe("initiateImportFromHTML", () => {
  beforeEach(() => {
    mockInsertTileSnapshotInDefaultRow.mockClear()
  })

  it("creates a hidden WebView tile with the correct state", () => {
    const html = "<table><tr><th>Name</th></tr><tr><td>Alice</td></tr></table>"
    initiateImportFromHTML(html)

    expect(mockInsertTileSnapshotInDefaultRow).toHaveBeenCalledTimes(1)

    const [tileSnap, options] = mockInsertTileSnapshotInDefaultRow.mock.calls[0]
    expect(tileSnap._title).toBe("Importer")
    expect(tileSnap.content.type).toBe("CodapWebView")
    expect(tileSnap.content.subType).toBe("plugin")
    expect(tileSnap.content.url).toBe(
      "https://codap-resources.concord.org/plugins/Importer/index.html?lang=en-US"
    )
    expect(tileSnap.content.state).toEqual({
      contentType: "text/html",
      name: "Importer",
      text: html
    })
    expect(options.isHidden).toBe(true)
  })
})
