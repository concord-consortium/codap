import { getSnapshot } from "mobx-state-tree"
import { ICaseTableModel, isCaseTableModel } from "../../components/case-table/case-table-model"
import { kCaseTableIdPrefix } from "../../components/case-table/case-table-registration"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { V2CaseCard } from "../data-interactive-component-types"
import { DIComponentInfo } from "../data-interactive-types"
import { diComponentHandler } from "./component-handler"
import { setupTestDataset } from "./handler-test-utils"
import { kCaseCardIdPrefix } from "../../components/case-card/case-card-registration"
import { ICaseCardModel, isCaseCardModel } from "../../components/case-card/case-card-model"


describe("DataInteractive ComponentHandler", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!

  it("create caseTable and caseCard work", () => {
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

    // Create a card card when no table exists for the dataset
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
  })
})
