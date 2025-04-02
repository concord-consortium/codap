import { createCodapDocument } from "../../models/codap/create-codap-document"
import { FreeTileRow, IFreeTileRow } from "../../models/document/free-tile-row"
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
import { ICodapV2CaseCardStorage, ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { kCaseCardTileType } from "./case-card-defs"
import { isCaseCardModel } from "./case-card-model"
import "./case-card-registration"

const fs = require("fs")
const path = require("path")

describe("Case card registration", () => {
  it("registers content and component info", () => {
    const cardContentInfo = getTileContentInfo(kCaseCardTileType)
    expect(cardContentInfo).toBeDefined()
    expect(getTileComponentInfo(kCaseCardTileType)).toBeDefined()
    const cardContent = cardContentInfo?.defaultContent()
    expect(cardContent).toBeDefined()
  })

  it("imports/exports v2 case card components", () => {
    const file = path.join(__dirname, "../../test/v2", "mammals-case-card.codap")
    const mammalsJson = fs.readFileSync(file, "utf8")
    const mammalsDoc = safeJsonParse<ICodapV2DocumentJson>(mammalsJson)!
    const v2Document = new CodapV2Document(mammalsDoc)

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

    const [v2TableComponent, v2GuideComponent, v2CardComponent] = v2Document.components
    expect(v2TableComponent.type).toBe("DG.TableView")
    expect(v2GuideComponent.type).toBe("DG.GuideView")
    expect(v2CardComponent.type).toBe("DG.CaseCard")

    const tile = importV2Component({
      v2Component: v2CardComponent,
      v2Document,
      getCaseData,
      getGlobalValues: jest.fn(),
      insertTile: mockInsertTile,
      linkSharedModel: mockLinkSharedModel
    })!
    expect(tile).toBeDefined()
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const cardContent = isCaseCardModel(tile?.content) ? tile?.content : undefined
    expect(getTileContentInfo(kCaseCardTileType)!.getTitle(tile)).toBe("Mammals")
    expect(cardContent?.data).toBeDefined()
    expect(cardContent?.attributeColumnWidths.size).toBe(1)

    const tileWithInvalidComponent = importV2Component({
      v2Component: {} as any,
      v2Document,
      getCaseData,
      getGlobalValues: jest.fn(),
      insertTile: mockInsertTile,
      linkSharedModel: mockLinkSharedModel
    })
    expect(tileWithInvalidComponent).toBeUndefined()

    const row = docContent.getRowByIndex(0) as IFreeTileRow
    const cardExport = exportV2Component({ tile, row, sharedModelManager })
    expect(cardExport?.type).toBe("DG.CaseCard")
    const cardStorage = cardExport!.componentStorage as ICodapV2CaseCardStorage
    expect(cardStorage._links_?.context).toBeDefined()
    expect(Object.keys(cardStorage.columnWidthMap!).length).toBe(1)
  })

})
