import { getSnapshot } from "mobx-state-tree"
import { IBaseNumericAxisModel } from "../axis/models/axis-model"
import { V2GetGraph } from "../../data-interactive/data-interactive-component-types"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { setupTestDataset, testCases } from "../../data-interactive/handlers/handler-test-utils"
import { testGetComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { appState } from "../../models/app-state"
import { toV2Id, toV3Id } from "../../utilities/codap-utils"
import { kGraphIdPrefix } from "./graph-defs"
import "./graph-registration"
import { IGraphContentModel, isGraphContentModel } from "./models/graph-content-model"

describe("DataInteractive ComponentHandler Graph", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!
  const { dataset: _dataset } = setupTestDataset()
  const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
  dataset.addCases(testCases, { canonicalize: true })
  dataset.validateCases()
  const a1 = dataset.getAttributeByName("a1")!
  const a2 = dataset.getAttributeByName("a2")!
  const a3 = dataset.getAttributeByName("a3")!

  it("create and get graph work", async () => {
    // Create a graph tile with no options
    expect(documentContent.tileMap.size).toBe(0)
    const vanillaResult = handler.create!({}, { type: "graph" })
    expect(vanillaResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const vanillaResultValues = vanillaResult.values as DIComponentInfo
    const vanillaTile = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, vanillaResultValues.id!))!
    expect(vanillaTile).toBeDefined()
    expect(isGraphContentModel(vanillaTile.content)).toBe(true)

    // Delete a graph tile
    const deleteResult = handler.delete!({ component: vanillaTile })
    expect(deleteResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(0)

    // Attributes must be the correct type
    expect(handler.create!({}, {
      type: "graph", dataContext: "data", rightNumericAttributeName: "a1"
    }).success).toBe(false)
    expect(handler.create!({}, {
      type: "graph", dataContext: "data", rightSplitAttributeName: "a3", xAttributeName: "a3"
    }).success).toBe(false)

    // Create a graph with ids
    const resultIds = handler.create!({}, {
      type: "graph", cannotClose: true, dataContext: "data", xAttributeID: toV2Id(a3.id), yAttributeID: toV2Id(a2.id),
      legendAttributeID: toV2Id(a1.id), captionAttributeID: toV2Id(a2.id), rightNumericAttributeID: toV2Id(a3.id),
      rightSplitAttributeID: toV2Id(a1.id), topSplitAttributeID: toV2Id(a2.id), topSplitAttributeName: "a3",
      enableNumberToggle: true, numberToggleLastMode: true
    })
    expect(resultIds.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultIdsValues = resultIds.values as DIComponentInfo
    const tileIds = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, resultIdsValues.id!))!
    expect(tileIds).toBeDefined()
    expect(isGraphContentModel(tileIds.content)).toBe(true)
    const tileContentIds = tileIds.content as IGraphContentModel
    expect(tileIds.cannotClose).toBe(true)
    expect(tileContentIds.dataConfiguration.attributeDescriptionForRole("x")?.attributeID).toBe(a3.id)
    expect(tileContentIds.dataConfiguration.attributeDescriptionForRole("y")?.attributeID).toBe(a2.id)
    expect(tileContentIds.dataConfiguration.attributeDescriptionForRole("legend")?.attributeID).toBe(a1.id)
    expect(tileContentIds.dataConfiguration.attributeDescriptionForRole("caption")?.attributeID).toBe(a2.id)
    expect(tileContentIds.dataConfiguration.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)
    expect(tileContentIds.dataConfiguration.attributeDescriptionForRole("rightSplit")?.attributeID).toBe(a1.id)
    // Id should trump name for topSplit
    expect(tileContentIds.dataConfiguration.attributeDescriptionForRole("topSplit")?.attributeID).toBe(a2.id)
    expect(tileContentIds.showParentToggles).toBe(true)
    // Make sure numberToggleLastMode hid all appropriate cases
    tileContentIds.layers.forEach(layer => {
      const lastCaseId = dataset.itemIds[dataset.itemIds.length - 1]
      dataset.itemIds.forEach(itemId => {
        expect(layer.dataConfiguration.hiddenCases.includes(itemId)).toBe(itemId !== lastCaseId)
      })
    })
    // Delete the graph when we're finished
    handler.delete!({ component: tileIds })
    expect(documentContent.tileMap.size).toBe(0)

    // Create a graph with options
    const result = handler.create!({}, {
      type: "graph", cannotClose: true, dataContext: "data", xAttributeName: "a3", yAttributeName: "a2",
      legendAttributeName: "a1", captionAttributeName: "a2", rightNumericAttributeName: "a3",
      rightSplitAttributeName: "a1", topSplitAttributeName: "a2", enableNumberToggle: true, numberToggleLastMode: true
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(isGraphContentModel(tile.content)).toBe(true)
    const tileContent = tile.content as IGraphContentModel
    expect(tile.cannotClose).toBe(true)
    expect(tileContent.dataConfiguration.attributeDescriptionForRole("x")?.attributeID).toBe(a3.id)
    expect(tileContent.dataConfiguration.attributeDescriptionForRole("y")?.attributeID).toBe(a2.id)
    expect(tileContent.dataConfiguration.attributeDescriptionForRole("legend")?.attributeID).toBe(a1.id)
    expect(tileContent.dataConfiguration.attributeDescriptionForRole("caption")?.attributeID).toBe(a2.id)
    expect(tileContent.dataConfiguration.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)
    expect(tileContent.dataConfiguration.attributeDescriptionForRole("rightSplit")?.attributeID).toBe(a1.id)
    expect(tileContent.dataConfiguration.attributeDescriptionForRole("topSplit")?.attributeID).toBe(a2.id)
    expect(tileContent.showParentToggles).toBe(true)
    // Make sure numberToggleLastMode hid all appropriate cases
    tileContent.layers.forEach(layer => {
      const lastCaseId = dataset.itemIds[dataset.itemIds.length - 1]
      dataset.itemIds.forEach(itemId => {
        expect(layer.dataConfiguration.hiddenCases.includes(itemId)).toBe(itemId !== lastCaseId)
      })
    })

    // Get graph
    testGetComponent(tile, handler, (graphTile, values) => {
      const {
        dataContext, enableNumberToggle, numberToggleLastMode, captionAttributeID, captionAttributeName,
        legendAttributeID, legendAttributeName, rightSplitAttributeID, rightSplitAttributeName,
        topSplitAttributeID, topSplitAttributeName, xAttributeID, xAttributeName, xLowerBound, xUpperBound,
        yAttributeID, yAttributeName, yLowerBound, yUpperBound,
        y2AttributeID, y2AttributeName, y2LowerBound, y2UpperBound
      } = values as V2GetGraph
      const content = graphTile.content as IGraphContentModel
      const graphDataset = content.dataset!
      expect(dataContext).toBe(graphDataset.name)
      const { dataConfiguration } = content.graphPointLayerModel
      expect(enableNumberToggle).toBe(content.showParentToggles)
      expect(numberToggleLastMode).toBe(content.showOnlyLastCase)

      const captionAttributeId = dataConfiguration.attributeDescriptionForRole("caption")!.attributeID
      expect(captionAttributeID).toBe(captionAttributeId)
      expect(captionAttributeName).toBe(graphDataset.getAttribute(captionAttributeId)?.name)

      const legendAttributeId = dataConfiguration.attributeDescriptionForRole("legend")!.attributeID
      expect(legendAttributeID).toBe(legendAttributeId)
      expect(legendAttributeName).toBe(graphDataset.getAttribute(legendAttributeId)?.name)

      const rightSplitId = dataConfiguration.attributeDescriptionForRole("rightSplit")!.attributeID
      expect(rightSplitAttributeID).toBe(rightSplitId)
      expect(rightSplitAttributeName).toBe(graphDataset.getAttribute(rightSplitId)?.name)

      const topSplitId = dataConfiguration.attributeDescriptionForRole("topSplit")!.attributeID
      expect(topSplitAttributeID).toBe(topSplitId)
      expect(topSplitAttributeName).toBe(graphDataset.getAttribute(topSplitId)?.name)

      const xAttributeId = dataConfiguration.attributeDescriptionForRole("x")!.attributeID
      expect(xAttributeID).toBe(xAttributeId)
      expect(xAttributeName).toBe(graphDataset.getAttribute(xAttributeId)?.name)
      const xAxis = content.getAxis("bottom") as IBaseNumericAxisModel
      expect(xLowerBound).toBe(xAxis.min)
      expect(xUpperBound).toBe(xAxis.max)

      const yAttributeId = dataConfiguration.attributeDescriptionForRole("y")!.attributeID
      expect(yAttributeID).toBe(yAttributeId)
      expect(yAttributeName).toBe(graphDataset.getAttribute(yAttributeId)?.name)
      const yAxis = content.getAxis("left") as IBaseNumericAxisModel
      expect(yLowerBound).toBe(yAxis.min)
      expect(yUpperBound).toBe(yAxis.max)

      const y2AttributeId = dataConfiguration.attributeDescriptionForRole("rightNumeric")!.attributeID
      expect(y2AttributeID).toBe(y2AttributeId)
      expect(y2AttributeName).toBe(graphDataset.getAttribute(y2AttributeId)?.name)
      const y2Axis = content.getAxis("rightNumeric") as IBaseNumericAxisModel
      expect(y2LowerBound).toBe(y2Axis.min)
      expect(y2UpperBound).toBe(y2Axis.max)
    })

    // Create multiple graphs for the same dataset
    const result2 = handler.create!({}, {
      type: "graph", dataContext: "data", xAttributeName: "a3", y2AttributeName: "a3"
    })
    expect(result2.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(2)
    const result2Values = result2.values as DIComponentInfo
    const tile2 = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, result2Values.id!))!
    expect(tile2).toBeDefined()
    expect(isGraphContentModel(tile2.content)).toBe(true)
    const tile2Content = tile2.content as IGraphContentModel
    // y2 and rightNumeric both set rightNumeric, so it's not possible to test them on the same graph
    expect(tile2Content.dataConfiguration.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)
  })
})
