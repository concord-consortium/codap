import { getSnapshot } from "mobx-state-tree"
import { ICaseCardModel, isCaseCardModel } from "../../components/case-card/case-card-model"
import { kCaseCardIdPrefix } from "../../components/case-card/case-card-registration"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { ICaseTableModel, isCaseTableModel } from "../../components/case-table/case-table-model"
import { kCaseTableIdPrefix } from "../../components/case-table/case-table-registration"
import * as caseTableUtils from "../../components/case-table/case-table-utils"
import { createOrShowTableOrCardForDataset } from "../../components/case-tile-common/case-tile-utils"
import "../../components/graph/graph-registration"
import "../../components/map/map-registration"
import { kCalculatorIdPrefix } from "../../components/calculator/calculator-registration"
import { kGraphIdPrefix } from "../../components/graph/graph-defs"
import { kMapIdPrefix } from "../../components/map/map-defs"
import { appState } from "../../models/app-state"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { uiState } from "../../models/ui-state"
import { toV3Id } from "../../utilities/codap-utils"
import { V2CaseCard, V2CaseTable } from "../data-interactive-component-types"
import { DIComponentInfo } from "../data-interactive-types"
import { diComponentHandler } from "./component-handler"
import { testGetComponent } from "./component-handler-test-utils"
import { setupTestDataset } from "../../test/dataset-test-utils"


describe("DataInteractive ComponentHandler", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!
  let dataset: ReturnType<typeof setupTestDataset>["dataset"]

  beforeEach(() => {
    const result = setupTestDataset()
    dataset = result.dataset
    documentContent.createDataSet(getSnapshot(dataset))
  })

  function createTile(type: string, idPrefix: string) {
    const result = handler.create?.({}, { type })
    expect(result?.success).toBe(true)
    const values = result?.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(idPrefix, values.id!))
    expect(tile).toBeDefined()
    return tile!
  }

  it("create and get caseTable and caseCard work", () => {

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
    const sharedDataSet = getSharedDataSets(documentContent)[0]
    const component = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    const tableContent = component.content as ICaseTableModel

    expect(handler.update?.({}, { horizontalScrollOffset: 100 }).success).toBe(false)
    expect(handler.update?.({ component }).success).toBe(false)

    expect(tableContent._horizontalScrollOffset).toBe(0)
    expect(handler.update?.({ component }, { horizontalScrollOffset: 100 }).success).toBe(true)
    expect(tableContent._horizontalScrollOffset).toBe(100)
  })

  it("update caseTable isIndexHidden works", () => {
    const sharedDataSet = getSharedDataSets(documentContent)[0]
    const component = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    const tableContent = component.content as ICaseTableModel

    // Initially undefined (not hidden)
    expect(tableContent.isIndexHidden).toBeUndefined()

    // Hide the index column
    expect(handler.update?.({ component }, { isIndexHidden: true }).success).toBe(true)
    expect(tableContent.isIndexHidden).toBe(true)

    // Show the index column
    expect(handler.update?.({ component }, { isIndexHidden: false }).success).toBe(true)
    expect(tableContent.isIndexHidden).toBe(false)

    // Hide again and verify get returns the value
    expect(handler.update?.({ component }, { isIndexHidden: true }).success).toBe(true)
    const getResult = handler.get?.({ component })
    expect(getResult?.success).toBe(true)
    expect((getResult?.values as V2CaseTable)?.isIndexHidden).toBe(true)
  })

  it("update common component properties works", () => {
    const graphTile = createTile("graph", kGraphIdPrefix)

    // Test updating name
    expect(graphTile.name).toBe("")
    expect(handler.update?.({ component: graphTile }, { name: "My Graph" }).success).toBe(true)
    expect(graphTile.name).toBe("My Graph")

    // Test updating isResizable
    expect(graphTile._isResizable).toBeUndefined()
    expect(graphTile.isResizable).toBe(true)
    expect(handler.update?.({ component: graphTile }, { isResizable: false }).success).toBe(true)
    expect(graphTile._isResizable).toBe(false)
    expect(graphTile.isResizable).toBe(false)
    expect(handler.update?.({ component: graphTile }, { isResizable: true }).success).toBe(true)
    expect(graphTile._isResizable).toBe(true)
    expect(graphTile.isResizable).toBe(true)

    // Test that get returns the updated values
    const getResult = handler.get?.({ component: graphTile })
    expect(getResult?.success).toBe(true)
    expect((getResult?.values as any)?.name).toBe("My Graph")
    expect((getResult?.values as any)?.isResizable).toBe(true)
  })

  describe("notify", () => {
    it("returns error when component or values are missing", () => {
      expect(handler.notify?.({}).success).toBe(false)

      const graphTile = createTile("graph", kGraphIdPrefix)
      expect(handler.notify?.({ component: graphTile }).success).toBe(false)
    })

    it("autoScale works for graph tiles", () => {
      const graphTile = createTile("graph", kGraphIdPrefix)
      const rescaleSpy = jest.spyOn(graphTile.content as any, "rescale")

      expect(handler.notify?.({ component: graphTile }, { request: "autoScale" }).success).toBe(true)
      expect(rescaleSpy).toHaveBeenCalled()
      rescaleSpy.mockRestore()
    })

    it("autoScale works for map tiles", () => {
      const mapTile = createTile("map", kMapIdPrefix)
      const rescaleSpy = jest.spyOn(mapTile.content as any, "rescale")

      expect(handler.notify?.({ component: mapTile }, { request: "autoScale" }).success).toBe(true)
      expect(rescaleSpy).toHaveBeenCalled()

      rescaleSpy.mockRestore()
    })

    it("autoScale works for case table tiles", () => {
      const sharedDataSet = getSharedDataSets(documentContent)[0]
      const tableTile = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)

      expect(isCaseTableModel(tableTile!.content)).toBe(true)

      const resizeAllColumnsSpy = jest.spyOn(caseTableUtils, "resizeAllColumns")
      expect(handler.notify?.({ component: tableTile }, { request: "autoScale" }).success).toBe(true)
      expect(resizeAllColumnsSpy).toHaveBeenCalledWith(tableTile!.content)

      resizeAllColumnsSpy.mockRestore()
    })

    it("autoScale returns error for unsupported component types", () => {
      const calcTile = createTile("calculator", kCalculatorIdPrefix)
      const result = handler.notify?.({ component: calcTile }, { request: "autoScale" })

      expect(result?.success).toBe(false)
    })

    it("select request works", () => {
      const graphTile = createTile("graph", kGraphIdPrefix)

      expect(handler.notify?.({ component: graphTile }, { request: "select" }).success).toBe(true)
      expect(uiState.focusedTile).toBe(graphTile.id)
    })
  })
})
