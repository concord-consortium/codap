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
import { ICodapV2DocumentJson, ICodapV2GameViewStorage, ICodapV2GuideViewStorage, ICodapV2WebViewStorage } from "../../v2/codap-v2-types"
import { kWebViewTileType } from "./web-view-defs"
import { isWebViewModel } from "./web-view-model"
import "./web-view-registration"

const path = require("path")
const fs = require("fs")

describe("WebView registration", () =>  {
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
      sharedModelManager,
      insertTile: mockInsertTile
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
      sharedModelManager,
      insertTile: mockInsertTile
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const content = isWebViewModel(tile?.content) ? tile?.content : undefined
    // Note: a component with a userSetTitle false (like in this case) does not import the
    // title into _title. However the name is imported.
    // When the _title is undefined the name is used as the title
    expect(tile._title).toBeUndefined()
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
    // Note: the value of the exported title can probably be anything here, but undefined seems
    // to be a safe value to make it clear to CODAPv2 that user hasn't set the title
    expect(contentStorage.title).toBeUndefined()
    expect(contentStorage.userSetTitle).toBe(false)

    // Note: we do not convert the URL back to the relative one that is used by CODAPv2
    // this seems OK to do.
    expect(contentStorage.currentGameUrl).toBe("https://codap-resources.concord.org/plugins/sdlc/plugin/index.html")
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
      sharedModelManager,
      insertTile: mockInsertTile
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
    expect(contentStorage.items[0].itemTitle).toBe("Roller Coasters Guide")
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
      sharedModelManager,
      insertTile: mockInsertTile
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
    expect(contentStorage.items[0].itemTitle).toBe("Mammals Sample Guide")
    expect(contentStorage.items[0].url).toBe("https://codap-resources.concord.org/example-documents/guides/Mammals/mammals_getstarted.html")
  })
})
