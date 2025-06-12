import { getSnapshot } from "mobx-state-tree"
import { ICaseCardModel, isCaseCardModel } from "../../components/case-card/case-card-model"
import { kCaseCardIdPrefix } from "../../components/case-card/case-card-registration"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { ICaseTableModel, isCaseTableModel } from "../../components/case-table/case-table-model"
import { kCaseTableIdPrefix } from "../../components/case-table/case-table-registration"
import { createOrShowTableOrCardForDataset } from "../../components/case-tile-common/case-tile-utils"
import { appState } from "../../models/app-state"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { toV3Id } from "../../utilities/codap-utils"
import { V2CaseCard, V2CaseTable } from "../data-interactive-component-types"
import { DIComponentInfo } from "../data-interactive-types"
import { diComponentHandler } from "./component-handler"
import { testGetComponent } from "./component-handler-test-utils"
import { setupTestDataset } from "../../test/dataset-test-utils"


describe("DataInteractive ComponentHandler", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!

  it("create and get caseTable and caseCard work", () => {
    const { dataset } = setupTestDataset()
    documentContent.createDataSet(getSnapshot(dataset))

    expect(handler.create?.({}).success).toBe(false)
    expect(handler.create?.({}, {}).success).toBe(false)
    expect(handler.create?.({}, { type: "unknown" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseTable" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseTable", dataContext: "unknown" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseCard" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseCard", dataContext: "unknown" } as V2CaseCard).success).toBe(false)

    // Create a table tile
    expect(documentContent.tileMap.size).toBe(0)
    const result = handler.create!({}, { type: "caseTable", dataContext: "data" })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kCaseTableIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(isCaseTableModel(tile.content)).toBe(true)
    expect((tile.content as ICaseTableModel).data?.id).toBe(dataset.id)

    // Get a table tile
    testGetComponent(tile, handler, (tTile, values) => {
      const { dataContext, horizontalScrollOffset } = values as V2CaseTable
      const tableContent = tile.content as ICaseTableModel
      expect(dataContext).toBe(tableContent.data?.name)
      expect(horizontalScrollOffset).toBe(tableContent._horizontalScrollOffset)
    })

    // Show a hidden table tile
    documentContent.toggleNonDestroyableTileVisibility(tile.id)
    expect(documentContent.isTileHidden(tile.id)).toBe(true)
    const result2 = handler.create!({}, { type: "caseTable", dataContext: "data" })
    expect(result2.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    expect(documentContent.isTileHidden(tile.id)).toBe(false)

    // Create a case card when a table is showing
    const cardResult = handler.create!({}, { type: "caseCard", dataContext: "data" })
    expect(cardResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(2)
    expect(documentContent.isTileHidden(tile.id)).toBe(true)
    const cardResultValues = cardResult.values as DIComponentInfo
    const cardTile = documentContent.tileMap.get(toV3Id(kCaseCardIdPrefix, cardResultValues.id!))!
    expect(cardTile).toBeDefined()
    expect(isCaseCardModel(cardTile.content)).toBe(true)
    expect((cardTile.content as ICaseCardModel).data?.id).toBe(dataset.id)
    expect(documentContent.isTileHidden(cardTile.id)).toBe(false)

    // Create a case card when no table exists for the dataset
    const { dataset: dataset2 } = setupTestDataset({ datasetName: "data2" })
    documentContent.createDataSet(getSnapshot(dataset2))
    const card2Result = handler.create!({}, { type: "caseCard", dataContext: "data2" })
    expect(card2Result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(3)
    const card2ResultValues = card2Result.values as DIComponentInfo
    const card2Tile = documentContent.tileMap.get(toV3Id(kCaseCardIdPrefix, card2ResultValues.id!))!
    expect(card2Tile).toBeDefined()
    expect(isCaseCardModel(card2Tile.content)).toBe(true)
    expect((card2Tile.content as ICaseCardModel).data?.id).toBe(dataset2.id)

    // Get a case card
    testGetComponent(cardTile, handler, (testTile, values) => {
      const { dataContext } = values as V2CaseCard
      expect(dataContext).toBe((testTile.content as ICaseCardModel).data?.name)
    })
  })

  it("update caseTable works", () => {
    const { dataset } = setupTestDataset()
    documentContent.createDataSet(getSnapshot(dataset))
    const sharedDataSet = getSharedDataSets(documentContent)[0]
    const component = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    const tableContent = component.content as ICaseTableModel

    expect(handler.update?.({}, { horizontalScrollOffset: 100 }).success).toBe(false)
    expect(handler.update?.({ component }).success).toBe(false)

    expect(tableContent._horizontalScrollOffset).toBe(0)
    expect(handler.update?.({ component }, { horizontalScrollOffset: 100 }).success).toBe(true)
    expect(tableContent._horizontalScrollOffset).toBe(100)
  })
})
