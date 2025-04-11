import { createCodapDocument } from "../../models/codap/create-codap-document"
import { FreeTileRow, IFreeTileRow } from "../../models/document/free-tile-row"
import { getTileSharedModels } from "../../models/shared/shared-data-tile-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2DataSetImporter, getCaseDataFromV2ContextGuid } from "../../v2/codap-v2-data-set-importer"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { exportV2Component } from "../../v2/codap-v2-tile-exporters"
import { importV2Component } from "../../v2/codap-v2-tile-importers"
import { ICodapV2DocumentJson, ICodapV2TableStorage } from "../../v2/codap-v2-types"
import { kCaseTableTileType } from "./case-table-defs"
import { isCaseTableModel } from "./case-table-model"
import "./case-table-registration"

const fs = require("fs")
const path = require("path")

describe("Case table registration", () => {
  it("registers content and component info", () => {
    const tableContentInfo = getTileContentInfo(kCaseTableTileType)
    expect(tableContentInfo).toBeDefined()
    expect(getTileComponentInfo(kCaseTableTileType)).toBeDefined()
    const tableContent = tableContentInfo?.defaultContent()
    expect(tableContent).toBeDefined()
  })

  it("imports/exports v2 case table components", () => {
    const file = path.join(__dirname, "../../test/v2", "24cats.codap")
    const catsJson = fs.readFileSync(file, "utf8")
    const catsDoc = safeJsonParse<ICodapV2DocumentJson>(catsJson)!
    const v2Document = new CodapV2Document(catsDoc)

    const codapDoc = createCodapDocument()
    const docContent = codapDoc.content!
    docContent.setRowCreator(() => FreeTileRow.create())
    const sharedModelManager = getSharedModelManager(docContent)

    // load shared models into sharedModelManager
    const dataSetImporter = new CodapV2DataSetImporter(v2Document.guidMap)
    v2Document.dataContexts.forEach((context) => {
      dataSetImporter.importContext(context, sharedModelManager)
    })

    const getCaseData = (dataContextGuid: number) => {
      return getCaseDataFromV2ContextGuid(dataContextGuid, sharedModelManager)
    }
    const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
      return docContent?.insertTileSnapshotInDefaultRow(tileSnap)
    })
    const mockLinkSharedModel = jest.fn(
      (tileContent: ITileContentModel, sharedModel?: ISharedModel, isProvider?: boolean) => {
        if (sharedModel) {
          sharedModelManager?.addTileSharedModel(tileContent, sharedModel, isProvider)
        }
    })

    const tile = importV2Component({
      v2Component: v2Document.components[0],
      v2Document,
      getCaseData,
      getGlobalValues: jest.fn(),
      insertTile: mockInsertTile,
      linkSharedModel: mockLinkSharedModel
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const tableContent = isCaseTableModel(tile?.content) ? tile?.content : undefined
    expect(tableContent).toBeDefined()
    expect(getTileContentInfo(kCaseTableTileType)!.getTitle(tile)).toBe("Domestic House Cats")
    expect(mockLinkSharedModel).toHaveBeenCalledTimes(2)
    expect(getTileSharedModels(tableContent!)).toHaveLength(2)
    expect(tableContent?.data).toBeDefined()
    expect(tableContent?.columnWidths.size).toBe(9)

    const tileWithInvalidComponent = importV2Component({
      v2Component: {} as any,
      v2Document,
      getCaseData,
      getGlobalValues: jest.fn(),
      insertTile: mockInsertTile,
      linkSharedModel: jest.fn()
    })
    expect(tileWithInvalidComponent).toBeUndefined()

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const tableExport = exportV2Component({ tile, row, sharedModelManager })
    expect(tableExport?.type).toBe("DG.TableView")
    const tableStorage = tableExport?.componentStorage as ICodapV2TableStorage
    expect(tableStorage._links_?.context).toBeDefined()
    expect(tableStorage.attributeWidths!.length).toBe(9)
  })

})
