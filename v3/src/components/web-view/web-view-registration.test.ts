import { createCodapDocument } from "../../models/codap/create-codap-document"
import { FreeTileRow, IFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { exportV2Component } from "../../v2/codap-v2-tile-exporters"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson, ICodapV2WebViewStorage } from "../../v2/codap-v2-types"
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
    expect(defaultContent).toBeDefined();
  })

  it("imports/exports v2 web view components", () => {
    // Note: when a image is dropped on CODAPv2 it makes a DG.ImageComponentView not a
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
    expect(getTileContentInfo(kWebViewTileType)!.getTitle(tile)).toBe("Walking Rates")
    expect(content?.url).toBe("https://codap-resources.concord.org/images/walkingrates-50-percent.png")

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const componentExport = exportV2Component({ tile, row, sharedModelManager })
    expect(componentExport?.type).toBe("DG.WebView")
    const contentStorage = componentExport?.componentStorage as ICodapV2WebViewStorage
    expect(contentStorage.URL).toBe("https://codap-resources.concord.org/images/walkingrates-50-percent.png")
  })
})
