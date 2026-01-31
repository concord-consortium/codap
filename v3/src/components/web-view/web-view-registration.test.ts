import { createCodapDocument } from "../../models/codap/create-codap-document"
import { FreeTileRow, IFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { hasOwnProperty, safeJsonParse } from "../../utilities/js-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { exportV2Component } from "../../v2/codap-v2-tile-exporters"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import {
  ICodapV2DocumentJson, ICodapV2GameViewStorage, ICodapV2GuideViewStorage, ICodapV2ImageComponentStorage,
  ICodapV2WebViewStorage
} from "../../v2/codap-v2-types"
import { kWebViewTileType } from "./web-view-defs"
import { isWebViewModel, IWebViewModel } from "./web-view-model"
import "./web-view-registration"

const path = require("path")
const fs = require("fs")

describe("WebView registration", () =>  {
  const mockGetGlobalValues = jest.fn()
  const mockGetCaseData = jest.fn()
  const mockLinkSharedModel = jest.fn()
  const mockImportArgs = {
    getCaseData: mockGetCaseData,
    getGlobalValues: mockGetGlobalValues,
    linkSharedModel: mockLinkSharedModel,
  }

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("registers content and component info", () => {
    const contentInfo = getTileContentInfo(kWebViewTileType)
    expect(contentInfo).toBeDefined()
    expect(getTileComponentInfo(kWebViewTileType)).toBeDefined()
    const defaultContent = contentInfo?.defaultContent()
    expect(defaultContent).toBeDefined()
  })

  it("imports/exports v2 web view components", () => {
    // Note: when an image is dropped on CODAPv2 it makes a DG.ImageComponentView not a
    // DG.WebView. This file was manually modified so the component is a DG.WebView
    const file = path.join(__dirname, "../../test/v2", "web-view-image.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(tile.name).toBe("https://codap-resources.concord.org/images/walkingrates-50-percent.png")
    expect(tile._title).toBe("Walking Rates")
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Walking Rates")
    expect(content?.url).toBe("https://codap-resources.concord.org/images/walkingrates-50-percent.png")
    expect(content?.isPlugin).toBe(false)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.WebView")
    const contentStorage = componentExport?.componentStorage as ICodapV2WebViewStorage
    expect(contentStorage.URL).toBe("https://codap-resources.concord.org/images/walkingrates-50-percent.png")
    expect(contentStorage.name).toBe("https://codap-resources.concord.org/images/walkingrates-50-percent.png")
    expect(contentStorage.title).toBe("Walking Rates")
    expect(contentStorage.userSetTitle).toBe(true)
  })

  it("imports/exports v2 game view components", () => {
    const file = path.join(__dirname, "../../test/v2", "game-view-microdata.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(tile._title).toBe("Microdata Portal")
    expect(tile.name).toBe("Microdata Portal")
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Microdata Portal")
    expect(content?.url).toBe("https://codap-resources.concord.org/plugins/sdlc/plugin/index.html")
    expect(content?.isPlugin).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.GameView")
    const contentStorage = componentExport?.componentStorage as ICodapV2GameViewStorage
    // shouldn't write out `name` property for GameView components
    expect(hasOwnProperty(contentStorage, "name")).toBe(false)
    expect(contentStorage.currentGameName).toBe("Microdata Portal")
    expect(contentStorage.title).toBe("Microdata Portal")
    expect(contentStorage.userSetTitle).toBe(false)

    // Note: we do not convert the URL back to the relative one that is used by CODAPv2
    // this seems OK to do.
    expect(contentStorage.currentGameUrl).toBe("https://codap-resources.concord.org/plugins/sdlc/plugin/index.html")
  })

  it("imports/exports v2 Markov game view components", () => {
    const file = path.join(__dirname, "../../test/v2", "markov-example.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(tile._title).toBe("Markov")
    expect(tile.name).toBe("Markov")
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Markov")
    expect(content?.url).toBe("https://codap-resources.concord.org/plugins/data-games/Markov/index.html")
    expect(content?.isPlugin).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.GameView")
    const contentStorage = componentExport?.componentStorage as ICodapV2GameViewStorage
    // shouldn't write out `name` property for GameView components
    expect(hasOwnProperty(contentStorage, "name")).toBe(false)
    expect(contentStorage.currentGameName).toBe("Markov")
    expect(contentStorage.title).toBe("Markov")
    expect(contentStorage.userSetTitle).toBe(false)

    // Note: we do not convert the URL back to the relative one that is used by CODAPv2
    // this seems OK to do.
    expect(contentStorage.currentGameUrl).toBe("https://codap-resources.concord.org/plugins/data-games/Markov/index.html")
  })

  it("imports/exports v2 guide view components with external url", () => {
    const file = path.join(__dirname, "../../test/v2", "roller-coasters-map.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[2],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Roller Coasters Guide")
    expect(content?.url).toBe("https://fi-esteem.s3.amazonaws.com/codap_documents/157coasters_getstarted_page1.html")
    expect(content?.isGuide).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow

    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.GuideView")
    const contentStorage = componentExport?.componentStorage as ICodapV2GuideViewStorage

    expect(hasOwnProperty(contentStorage, "name")).toBe(true)
    expect(contentStorage.name).toBe("Roller Coasters Guide")
    expect(contentStorage.items).toBeDefined()
    expect(contentStorage.items[0].itemTitle).toBe("Getting Started")
    expect(contentStorage.items[0].url).toBe("https://fi-esteem.s3.amazonaws.com/codap_documents/157coasters_getstarted_page1.html")
  })

  it("imports/exports v2 guide view components with relative url", () => {
    const file = path.join(__dirname, "../../test/v2", "mammals-relative-guide.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[1],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    expect(tile).toBeDefined()

    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Mammals Sample Guide")
    expect(content?.url).toBe("https://codap-resources.concord.org/example-documents/guides/Mammals/mammals_getstarted.html")
    expect(content?.isGuide).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.GuideView")
    const contentStorage = componentExport?.componentStorage as ICodapV2GuideViewStorage

    expect(hasOwnProperty(contentStorage, "name")).toBe(true)
    expect(contentStorage.name).toBe("Mammals Sample Guide")
    expect(contentStorage.items).toBeDefined()
    expect(contentStorage.items[0].itemTitle).toBe("Get Started")
    expect(contentStorage.items[0].url).toBe("https://codap-resources.concord.org/example-documents/guides/Mammals/mammals_getstarted.html")
  })

  it("imports/exports v2 guide view components of legacy documents", () => {
    const file = path.join(__dirname, "../../test/v2", "ramp-game-multi-guide.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[3],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!

    expect(tile).toBeDefined()

    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Ramp Game")
    expect(content?.url).toBe("https://inquiryspace-resources.concord.org/guides/how-to-guide/1.html")
    expect(content?.isGuide).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.GuideView")
    const contentStorage = componentExport?.componentStorage as ICodapV2GuideViewStorage

    expect(hasOwnProperty(contentStorage, "name")).toBe(true)
    expect(contentStorage.name).toBe("Ramp Game")
    expect(contentStorage.items).toBeDefined()
    expect(contentStorage.items[0].itemTitle).toBe("- How-to Guide: new vocabulary")
    expect(contentStorage.items[0].url).toBe("https://inquiryspace-resources.concord.org/guides/how-to-guide/1.html")
  })

  it("imports/exports v2 guide view component with multi-page guide", () => {
    const file = path.join(__dirname, "../../test/v2", "ramp-game-multi-guide.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[3],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!

    expect(tile).toBeDefined()

    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Ramp Game")
    expect(content?.url).toBe("https://inquiryspace-resources.concord.org/guides/how-to-guide/1.html")
    expect(content?.isGuide).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.GuideView")
    const contentStorage = componentExport?.componentStorage as ICodapV2GuideViewStorage

    expect(hasOwnProperty(contentStorage, "name")).toBe(true)
    expect(contentStorage.name).toBe("Ramp Game")
    expect(contentStorage.items).toBeDefined()
    expect(contentStorage.items).toHaveLength(9)
    expect(contentStorage.items[8].itemTitle).toBe("How do I enter formulas?")
    expect(contentStorage.items[8].url).toBe("https://inquiryspace-resources.concord.org/guides/how-to-guide/9.html")
  })

  it("imports/exports v2 image component view with url", () => {
    const file = path.join(__dirname, "../../test/v2", "four-seals-image-url.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[1],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    expect(tile).toBeDefined()

    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Getting Started")
    expect(content?.url).toBe("https://codap-resources.concord.org/example-documents/guides/images/edc-oceans-of-data-logo.png")
    expect(content?.isImage).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.ImageComponentView")
    const contentStorage = componentExport?.componentStorage as ICodapV2ImageComponentStorage

    expect(hasOwnProperty(contentStorage, "name")).toBe(true)
    expect(contentStorage.name).toBe("Oceans of Data")
    expect(contentStorage.URL).toBe("https://codap-resources.concord.org/example-documents/guides/images/edc-oceans-of-data-logo.png")
  })

  it("imports/exports v2 image component view with image data", () => {
    const file = path.join(__dirname, "../../test/v2", "png-doc.codap")
    const json = fs.readFileSync(file, "utf8")
    const doc = safeJsonParse<ICodapV2DocumentJson>(json)!
    const v2Document = new CodapV2Document(doc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })

    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      insertTile: mockInsertTile,
      ...mockImportArgs
    })!
    expect(tile).toBeDefined()

    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("forest fire slider.png")
    expect(content?.url).toContain("data:image/png;base64")
    expect(content?.isImage).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.ImageComponentView")
    const contentStorage = componentExport?.componentStorage as ICodapV2ImageComponentStorage

    expect(hasOwnProperty(contentStorage, "name")).toBe(true)
    expect(contentStorage.name).toBe("forest fire slider.png")
    expect(contentStorage.URL).toContain("data:image/png;base64")
  })

  it("exports image tiles with correct type and component storage", () => {
    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const tile = docContent.createTile(kWebViewTileType)!
    const content = tile.content as IWebViewModel

    // Set up an image tile with a data URL
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    content.setUrl(dataUrl)
    content.setSubType("image")
    tile.setName("sample-image")
    tile.setTitle("Sample Image")

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })

    // Verify it exports as DG.ImageComponentView
    expect(componentExport?.type).toBe("DG.ImageComponentView")

    // Verify the component storage includes name, title, and URL
    const contentStorage = componentExport?.componentStorage as ICodapV2ImageComponentStorage
    expect(contentStorage.name).toBe("sample-image")
    expect(contentStorage.title).toBe("Sample Image")
    expect(contentStorage.URL).toBe(dataUrl)
  })

  it("imports/exports v2 game view components with custom title", () => {
    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)
    const tile = docContent.createTile(kWebViewTileType)!
    const content = tile.content as IWebViewModel

    content.setUrl("https://example.com/plugin.html")
    content.setSubType("plugin")
    tile.setName("Default Plugin Name")
    tile.setUserTitle("Custom Plugin Title")
    expect(tile._title).toBe("Custom Plugin Title")
    expect(tile.userSetTitle).toBe(true)

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    const contentStorage = componentExport?.componentStorage as ICodapV2GameViewStorage
    expect(contentStorage.currentGameName).toBe("Default Plugin Name")
    expect(contentStorage.title).toBe("Custom Plugin Title")
    expect(contentStorage.userSetTitle).toBe(true)
  })
})
