/**
 * Tests for WebView importer URL rewriting in the deployed environment where
 * kCodapResourcesUrl is a relative path ("/codap-resources").
 * This simulates the behavior on codap3.concord.org / codap.concord.org.
 */

// Mock constants to simulate deployed environment (not localhost)
jest.mock("../../constants", () => {
  const kCodapResourcesUrl = "/codap-resources"
  const codapResourcesUrl = (relUrl: string) => `${kCodapResourcesUrl}/${relUrl}`
  return {
    ...jest.requireActual("../../constants"),
    getCodapResourcesUrl: () => kCodapResourcesUrl,
    kCodapResourcesUrl,
    codapResourcesUrl,
    kRootPluginsUrl: codapResourcesUrl("plugins"),
    kRootDataGamesPluginUrl: codapResourcesUrl("plugins/data-games"),
    kRootGuideUrl: codapResourcesUrl("example-documents/guides"),
  }
})

import { createCodapDocument } from "../../models/codap/create-codap-document"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { isWebViewModel } from "./web-view-model"
import "./web-view-registration"

describe("WebView importer URL rewriting (deployed/relative URLs)", () => {
  const mockImportArgs = {
    getCaseData: jest.fn(),
    getGlobalValues: jest.fn(),
    linkSharedModel: jest.fn(),
  }

  function importWebViewWithUrl(url: string) {
    const doc: ICodapV2DocumentJson = {
      name: "test", guid: 1, id: 1, appName: "DG", appVersion: "2.0", appBuildNum: "0730",
      lang: "en", idCount: 2, metadata: {},
      components: [{
        type: "DG.WebView", guid: 2, id: 2,
        componentStorage: { title: "Test", URL: url, name: url, userSetTitle: false, cannotClose: false },
        layout: { left: 0, top: 0, width: 400, height: 300, isVisible: true },
        savedHeight: null
      }],
      contexts: [], globalValues: []
    }
    const v2Document = new CodapV2Document(doc)
    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })
    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    return content?.url
  }

  function importGameViewWithUrl(url: string) {
    const doc: ICodapV2DocumentJson = {
      name: "test", guid: 1, id: 1, appName: "DG", appVersion: "2.0", appBuildNum: "0730",
      lang: "en", idCount: 2, metadata: {},
      components: [{
        type: "DG.GameView", guid: 2, id: 2,
        componentStorage: {
          currentGameName: "Test Plugin", currentGameUrl: url,
          title: "Test Plugin", userSetTitle: false, cannotClose: false
        },
        layout: { left: 0, top: 0, width: 400, height: 300, isVisible: true },
        savedHeight: null
      }],
      contexts: [], globalValues: []
    }
    const v2Document = new CodapV2Document(doc)
    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })
    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    return content?.url
  }

  it("rewrites codap-resources.concord.org WebView URLs to relative paths", () => {
    expect(importWebViewWithUrl("https://codap-resources.concord.org/images/test.png"))
      .toBe("/codap-resources/images/test.png")
  })

  it("rewrites codap3.concord.org/plugins/ WebView URLs to relative paths", () => {
    expect(importWebViewWithUrl("https://codap3.concord.org/plugins/onboarding/index.html"))
      .toBe("/codap-resources/plugins/onboarding/index.html")
  })

  it("rewrites codap-resources.concord.org GameView URLs to relative paths", () => {
    expect(importGameViewWithUrl("https://codap-resources.concord.org/plugins/sdlc/plugin/index.html"))
      .toBe("/codap-resources/plugins/sdlc/plugin/index.html")
  })

  it("does not rewrite external URLs", () => {
    expect(importWebViewWithUrl("https://example.com/my-page.html"))
      .toBe("https://example.com/my-page.html")
  })

  it("preserves relative /codap-resources/ URLs without double-rewriting", () => {
    expect(importWebViewWithUrl("/codap-resources/plugins/Foo/index.html"))
      .toBe("/codap-resources/plugins/Foo/index.html")
  })
})
