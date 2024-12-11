// TODO Rename this file after the PR is approved

import { getSnapshot } from "mobx-state-tree"
import { IBaseNumericAxisModel } from "../axis/models/axis-model"
import { V2GetGraph, V2Graph } from "../../data-interactive/data-interactive-component-types"
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
  const a4 = dataset.getAttributeByName("a4")!

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

    // Create a graph with multiple y attributes using ids
    const resultYIDs = handler.create!({}, {
      type: "graph", dataContext: "data", yAttributeIDs: [toV2Id(a3.id), toV2Id(a4.id)]
    })
    expect(resultYIDs.success).toBe(true)
    const resultYIDsValues = resultYIDs.values as DIComponentInfo
    const tileYIDs = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, resultYIDsValues.id!))!
    expect(tileYIDs).toBeDefined()
    expect(isGraphContentModel(tileYIDs.content)).toBe(true)
    const tileContentYIDs = tileYIDs.content as IGraphContentModel
    expect(tileContentYIDs.dataConfiguration._yAttributeDescriptions.length).toBe(2)
    expect(tileContentYIDs.dataConfiguration._yAttributeDescriptions[0].attributeID).toBe(a3.id)
    expect(tileContentYIDs.dataConfiguration._yAttributeDescriptions[1].attributeID).toBe(a4.id)
    // Delete the graph when we're finished
    handler.delete!({ component: tileYIDs })
    expect(documentContent.tileMap.size).toBe(0)

    // Create a graph with multiple y attributes using names
    const resultYNames = handler.create!({}, {
      type: "graph", dataContext: "data", yAttributeNames: [a3.name, a4.name]
    })
    expect(resultYNames.success).toBe(true)
    const resultYNamesValues = resultYNames.values as DIComponentInfo
    const tileYNames = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, resultYNamesValues.id!))!
    expect(tileYNames).toBeDefined()
    expect(isGraphContentModel(tileYNames.content)).toBe(true)
    const tileContentYNames = tileYNames.content as IGraphContentModel
    expect(tileContentYNames.dataConfiguration._yAttributeDescriptions.length).toBe(2)
    expect(tileContentYNames.dataConfiguration._yAttributeDescriptions[0].attributeID).toBe(a3.id)
    expect(tileContentYNames.dataConfiguration._yAttributeDescriptions[1].attributeID).toBe(a4.id)
    // Delete the graph when we're finished
    handler.delete!({ component: tileYNames })
    expect(documentContent.tileMap.size).toBe(0)

    // Create a graph with options
    const result = handler.create!({}, {
      type: "graph", cannotClose: true, dataContext: "data", xAttributeName: "a3", yAttributeName: "a4",
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
    const dataConfig = tileContent.dataConfiguration
    expect(tile.cannotClose).toBe(true)
    expect(dataConfig.attributeDescriptionForRole("x")?.attributeID).toBe(a3.id)
    expect(dataConfig.attributeDescriptionForRole("y")?.attributeID).toBe(a4.id)
    expect(dataConfig.attributeDescriptionForRole("legend")?.attributeID).toBe(a1.id)
    expect(dataConfig.attributeDescriptionForRole("caption")?.attributeID).toBe(a2.id)
    expect(dataConfig.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)
    expect(dataConfig.attributeDescriptionForRole("rightSplit")?.attributeID).toBe(a1.id)
    expect(dataConfig.attributeDescriptionForRole("topSplit")?.attributeID).toBe(a2.id)
    expect(tileContent.showParentToggles).toBe(true)
    // Make sure numberToggleLastMode hid all appropriate cases
    tileContent.layers.forEach(layer => {
      const lastCaseId = dataset.itemIds[dataset.itemIds.length - 1]
      dataset.itemIds.forEach(itemId => {
        expect(layer.dataConfiguration.hiddenCases.includes(itemId)).toBe(itemId !== lastCaseId)
      })
    })

    // Update a graph's axis bounds
    const xAxis = tileContent.getAxis("bottom") as IBaseNumericAxisModel
    const yAxis = tileContent.getAxis("left") as IBaseNumericAxisModel
    const y2Axis = tileContent.getAxis("rightNumeric") as IBaseNumericAxisModel
    expect(xAxis.min).toBe(-.5)
    expect(xAxis.max).toBe(7.5)
    expect(yAxis.min).toBe(-6.5)
    expect(yAxis.max).toBe(1.5)
    expect(y2Axis.min).toBe(-.5)
    expect(y2Axis.max).toBe(7.5)
    const updateBoundsResult = handler.update!({ component: tile }, {
      xLowerBound: 2, xUpperBound: 6, yLowerBound: -20, yUpperBound: 10, y2LowerBound: -3, y2UpperBound: 13
    })
    expect(updateBoundsResult.success).toBe(true)
    expect(xAxis.min).toBe(2)
    expect(xAxis.max).toBe(6)
    expect(yAxis.min).toBe(-20)
    expect(yAxis.max).toBe(10)
    expect(y2Axis.min).toBe(-3)
    expect(y2Axis.max).toBe(13)

    // Update a graph to switch attributes
    const updateResult1 = handler.update!({ component: tile }, {
      xAttributeName: "a2", yAttributeName: "a1", legendAttributeName: "a2", captionAttributeName: "a1",
      rightNumericAttributeName: "a4", rightSplitAttributeName: "a1", topSplitAttributeName: "a1",
      enableNumberToggle: false, numberToggleLastMode: false
    })
    expect(updateResult1.success).toBe(true)
    expect(dataConfig.attributeDescriptionForRole("x")?.attributeID).toBe(a2.id)
    expect(dataConfig.attributeDescriptionForRole("y")?.attributeID).toBe(a1.id)
    expect(dataConfig.attributeDescriptionForRole("legend")?.attributeID).toBe(a2.id)
    expect(dataConfig.attributeDescriptionForRole("caption")?.attributeID).toBe(a1.id)
    expect(dataConfig.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a4.id)
    expect(dataConfig.attributeDescriptionForRole("rightSplit")?.attributeID).toBe(a1.id)
    expect(dataConfig.attributeDescriptionForRole("topSplit")?.attributeID).toBe(a1.id)
    expect(tileContent.showParentToggles).toBe(false)

    // Update a graph to remove attributes
    const updateResult2 = handler.update!({ component: tile }, {
      xAttributeName: null, yAttributeName: null, legendAttributeName: null, captionAttributeID: null,
      rightNumericAttributeName: null, rightSplitAttributeName: null, topSplitAttributeName: null
    } as V2Graph)
    expect(updateResult2.success).toBe(true)
    expect(dataConfig.attributeDescriptionForRole("x")?.attributeID).toBeUndefined()
    expect(dataConfig.attributeDescriptionForRole("y")?.attributeID).toBeUndefined()
    expect(dataConfig.attributeDescriptionForRole("legend")?.attributeID).toBeUndefined()
    expect(dataConfig.attributeDescriptionForRole("caption")?.attributeID).toBeUndefined()
    expect(dataConfig.attributeDescriptionForRole("rightNumeric")?.attributeID).toBeUndefined()
    expect(dataConfig.attributeDescriptionForRole("rightSplit")?.attributeID).toBeUndefined()
    expect(dataConfig.attributeDescriptionForRole("topSplit")?.attributeID).toBeUndefined()

    // Update a graph to add attributes
    const updateResult3 = handler.update!({ component: tile }, {
      xAttributeID: toV2Id(a3.id), xAttributeName: "a2", yAttributeID: toV2Id(a2.id), legendAttributeID: toV2Id(a3.id),
      captionAttributeID: toV2Id(a2.id), rightSplitAttributeID: toV2Id(a1.id), topSplitAttributeID: toV2Id(a2.id),
      enableNumberToggle: true, numberToggleLastMode: true
    })
    expect(updateResult3.success).toBe(true)
    // Id should trump name
    expect(dataConfig.attributeDescriptionForRole("x")?.attributeID).toBe(a3.id)
    expect(dataConfig.attributeDescriptionForRole("y")?.attributeID).toBe(a2.id)
    expect(dataConfig.attributeDescriptionForRole("legend")?.attributeID).toBe(a3.id)
    expect(dataConfig.attributeDescriptionForRole("caption")?.attributeID).toBe(a2.id)
    expect(dataConfig.attributeDescriptionForRole("rightSplit")?.attributeID).toBe(a1.id)
    expect(dataConfig.attributeDescriptionForRole("topSplit")?.attributeID).toBe(a2.id)
    expect(tileContent.showParentToggles).toBe(true)

    // We have to set a numeric x attribute before we can set the rightNumeric attribute
    handler.update!({ component: tile }, {
      rightNumericAttributeID: toV2Id(a3.id)
    })
    expect(dataConfig.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)

    // Update to remove y attributes
    const updateResultRemoveYs = handler.update!({ component: tile }, {
      yAttributeNames: [] as string[]
    } as V2Graph)
    expect(updateResultRemoveYs.success).toBe(true)
    expect(dataConfig._yAttributeDescriptions.length).toBe(0)

    // Update to set multiple y attributes with names
    const updateResultYNames = handler.update!({ component: tile }, {
      yAttributeNames: [a4.name, a3.name]
    } as V2Graph)
    expect(updateResultYNames.success).toBe(true)
    expect(dataConfig._yAttributeDescriptions.length).toBe(2)
    expect(dataConfig._yAttributeDescriptions[0].attributeID).toBe(a4.id)
    expect(dataConfig._yAttributeDescriptions[1].attributeID).toBe(a3.id)

    // Update to set y attributes with ids
    const updateResultYIDs = handler.update!({ component: tile }, {
      yAttributeIDs: [toV2Id(a3.id)]
    } as V2Graph)
    expect(updateResultYIDs.success).toBe(true)
    expect(dataConfig._yAttributeDescriptions.length).toBe(1)
    expect(dataConfig._yAttributeDescriptions[0].attributeID).toBe(a3.id)

    // Get graph
    testGetComponent(tile, handler, (graphTile, values) => {
      const {
        dataContext, enableNumberToggle, numberToggleLastMode, captionAttributeID, captionAttributeName,
        legendAttributeID, legendAttributeName, rightSplitAttributeID, rightSplitAttributeName,
        topSplitAttributeID, topSplitAttributeName, xAttributeID, xAttributeName, xLowerBound, xUpperBound,
        yAttributeID, yAttributeIDs, yAttributeName, yAttributeNames, yLowerBound, yUpperBound,
        y2AttributeID, y2AttributeName, y2LowerBound, y2UpperBound
      } = values as V2GetGraph
      const content = graphTile.content as IGraphContentModel
      const graphDataset = content.dataset!
      expect(dataContext).toBe(graphDataset.name)
      const { dataConfiguration } = content.graphPointLayerModel
      expect(enableNumberToggle).toBe(content.showParentToggles)
      expect(numberToggleLastMode).toBe(content.showOnlyLastCase)

      const captionAttributeId = dataConfiguration.attributeDescriptionForRole("caption")!.attributeID
      expect(captionAttributeID).toBe(toV2Id(captionAttributeId))
      expect(captionAttributeName).toBe(graphDataset.getAttribute(captionAttributeId)?.name)

      const legendAttributeId = dataConfiguration.attributeDescriptionForRole("legend")!.attributeID
      expect(legendAttributeID).toBe(toV2Id(legendAttributeId))
      expect(legendAttributeName).toBe(graphDataset.getAttribute(legendAttributeId)?.name)

      const rightSplitId = dataConfiguration.attributeDescriptionForRole("rightSplit")!.attributeID
      expect(rightSplitAttributeID).toBe(toV2Id(rightSplitId))
      expect(rightSplitAttributeName).toBe(graphDataset.getAttribute(rightSplitId)?.name)

      const topSplitId = dataConfiguration.attributeDescriptionForRole("topSplit")!.attributeID
      expect(topSplitAttributeID).toBe(toV2Id(topSplitId))
      expect(topSplitAttributeName).toBe(graphDataset.getAttribute(topSplitId)?.name)

      const xAttributeId = dataConfiguration.attributeDescriptionForRole("x")!.attributeID
      expect(xAttributeID).toBe(toV2Id(xAttributeId))
      expect(xAttributeName).toBe(graphDataset.getAttribute(xAttributeId)?.name)
      expect(xLowerBound).toBe(xAxis.min)
      expect(xUpperBound).toBe(xAxis.max)

      const yAttributeId = dataConfiguration.attributeDescriptionForRole("y")!.attributeID
      expect(yAttributeID).toBe(toV2Id(yAttributeId))
      expect(yAttributeIDs?.length).toBe(1)
      expect(yAttributeIDs?.[0]).toBe(toV2Id(a3.id))
      expect(yAttributeName).toBe(graphDataset.getAttribute(yAttributeId)?.name)
      expect(yAttributeNames?.length).toBe(1)
      expect(yAttributeNames?.[0]).toBe(a3.name)
      expect(yLowerBound).toBe(yAxis.min)
      expect(yUpperBound).toBe(yAxis.max)

      const y2AttributeId = dataConfiguration.attributeDescriptionForRole("rightNumeric")!.attributeID
      expect(y2AttributeID).toBe(toV2Id(y2AttributeId))
      expect(y2AttributeName).toBe(graphDataset.getAttribute(y2AttributeId)?.name)
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
