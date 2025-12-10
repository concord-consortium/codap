import { getSnapshot } from "mobx-state-tree"
import { V2GetGraph, V2Graph } from "../../data-interactive/data-interactive-component-types"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { setupTestDataset, testCases } from "../../test/dataset-test-utils"
import { testGetComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { appState } from "../../models/app-state"
import { toV2Id, toV3Id } from "../../utilities/codap-utils"
import { IBaseNumericAxisModel } from "../axis/models/base-numeric-axis-model"
import { kGraphIdPrefix } from "./graph-defs"
import { IGraphContentModel, isGraphContentModel } from "./models/graph-content-model"

import "./graph-registration"

describe("DataInteractive ComponentHandler Graph", () => {
  const handler = diComponentHandler
  const create = handler.create!
  const update = handler.update!
  const documentContent = appState.document.content!
  const { dataset: _dataset } = setupTestDataset()
  const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
  dataset.addCases(testCases, { canonicalize: true })
  dataset.validateCases()
  const a1 = dataset.getAttributeByName("a1")!
  const a2 = dataset.getAttributeByName("a2")!
  const a3 = dataset.getAttributeByName("a3")!
  const a4 = dataset.getAttributeByName("a4")!
  const c1 = dataset.collections[2].caseGroups[0]
  const c2 = dataset.collections[2].caseGroups[1]

  it("create, get, and update graph work", async () => {
    // Create a graph tile with no options
    expect(documentContent.tileMap.size).toBe(0)
    const vanillaResult = create({}, { type: "graph" })
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
    expect(create({}, { type: "graph", dataContext: "data", rightNumericAttributeName: "a1" }).success).toBe(false)
    expect(create({}, {
      type: "graph", dataContext: "data", rightSplitAttributeName: "a3", xAttributeName: "a3"
    }).success).toBe(false)

    // Create a graph with ids
    const backgroundColor = "#000000"
    const initialPlotType = "dotPlot"
    const updatedPlotType = "scatterPlot"
    const pointColor = "#FFFFFF"
    const pointSize = 2
    const strokeColor = "#FF0000"
    const transparent = true
    const yAttributeType = "categorical"
    const y2AttributeType = "categorical"
    const graphSnapshot: V2Graph = {
      type: "graph", backgroundColor, cannotClose: true, dataContext: "data",
      plotType: initialPlotType, pointColor, pointSize, strokeColor,
      transparent, xAttributeID: toV2Id(a3.id), yAttributeID: toV2Id(a2.id), yAttributeType,
      legendAttributeID: toV2Id(a1.id), captionAttributeID: toV2Id(a2.id), y2AttributeID: toV2Id(a3.id),
      rightSplitAttributeID: toV2Id(a1.id), topSplitAttributeID: toV2Id(a2.id), topSplitAttributeName: "a3",
      enableNumberToggle: true, numberToggleLastMode: true, y2AttributeType
    }
    const resultIds = create({}, graphSnapshot)
    expect(resultIds.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultIdsValues = resultIds.values as DIComponentInfo
    const tileModel = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, resultIdsValues.id!))!
    expect(tileModel).toBeDefined()
    expect(isGraphContentModel(tileModel.content)).toBe(true)
    const tileContentModel = tileModel.content as IGraphContentModel
    expect(tileModel.cannotClose).toBe(true)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("x")?.attributeID).toBe(a3.id)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("y")?.attributeID).toBe(a2.id)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("y")?.type).toBe(yAttributeType)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("legend")?.attributeID).toBe(a1.id)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("caption")?.attributeID).toBe(a2.id)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("rightNumeric")?.type).toBe(y2AttributeType)
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("rightSplit")?.attributeID).toBe(a1.id)
    // Id should trump name for topSplit
    expect(tileContentModel.dataConfiguration.attributeDescriptionForRole("topSplit")?.attributeID).toBe(a2.id)
    expect(tileContentModel.plotType).toBe(initialPlotType)
    expect(tileContentModel.showParentToggles).toBe(true)
    // Make sure numberToggleLastMode hid all appropriate cases
    tileContentModel.layers.forEach(layer => {
      const lastCaseId = dataset.itemIds[dataset.itemIds.length - 1]
      dataset.itemIds.forEach(itemId => {
        expect(layer.dataConfiguration.hiddenCases.includes(itemId)).toBe(itemId !== lastCaseId)
      })
    })
    const pointDescription = tileContentModel.pointDescription
    expect(pointDescription.pointColor).toBe(pointColor)
    expect(pointDescription.pointSizeMultiplier).toBe(pointSize)
    expect(pointDescription.pointStrokeColor).toBe(strokeColor)
    expect(tileContentModel.isTransparent).toBe(transparent)
    // Delete the graph when we're finished
    handler.delete!({ component: tileModel })
    expect(documentContent.tileMap.size).toBe(0)

    // Create a graph with multiple y attributes using ids
    const displayOnlySelectedCases = true
    const filterFormula = "a3 > 1"
    const _hiddenCases = [c1.groupedCase.__id__, c2.groupedCase.__id__]
    const strokeSameAsFill = true
    const xAttributeType = "categorical"
    const resultYIDs = create({}, {
      type: "graph", dataContext: "data", displayOnlySelectedCases, filterFormula,
      hiddenCases: _hiddenCases.map(id => toV2Id(id)), strokeSameAsFill, xAttributeID: toV2Id(a3.id), xAttributeType,
      yAttributeIDs: [toV2Id(a3.id), toV2Id(a4.id)]
    })
    expect(resultYIDs.success).toBe(true)
    const resultYIDsValues = resultYIDs.values as DIComponentInfo
    const tileYIDs = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, resultYIDsValues.id!))!
    expect(tileYIDs).toBeDefined()
    expect(isGraphContentModel(tileYIDs.content)).toBe(true)
    const tileContentYIDs = tileYIDs.content as IGraphContentModel
    expect(tileContentYIDs.dataConfiguration.attributeDescriptionForRole("x")?.attributeID).toBe(a3.id)
    expect(tileContentYIDs.dataConfiguration.attributeDescriptionForRole("x")?.type).toBe(xAttributeType)
    expect(tileContentYIDs.dataConfiguration._yAttributeDescriptions.length).toBe(2)
    expect(tileContentYIDs.dataConfiguration._yAttributeDescriptions[0].attributeID).toBe(a3.id)
    expect(tileContentYIDs.dataConfiguration._yAttributeDescriptions[1].attributeID).toBe(a4.id)
    expect(tileContentYIDs.dataConfiguration.displayOnlySelectedCases).toBe(displayOnlySelectedCases)
    expect(tileContentYIDs.dataConfiguration.filterFormula?.display).toBe(filterFormula)
    expect(tileContentYIDs.pointDescription.pointStrokeSameAsFill).toBe(strokeSameAsFill)
    const hiddenCases = tileContentYIDs.dataConfiguration.hiddenCases
    expect(hiddenCases.length).toBe(_hiddenCases.length)
    for (let i = 0; i < hiddenCases.length; i++) {
      expect(hiddenCases[i]).toBe(_hiddenCases[i])
    }

    // Delete the graph when we're finished
    handler.delete!({ component: tileYIDs })
    expect(documentContent.tileMap.size).toBe(0)

    // Create a graph with multiple y attributes using names
    const resultYNames = create({}, { type: "graph", dataContext: "data", yAttributeNames: [a3.name, a4.name] })
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
    const result = create({}, {
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
    const updateBoundsResult = update({ component: tile }, {
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
    const updateResult1 = update({ component: tile }, {
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
    const updateResult2 = update({ component: tile }, {
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
    const updateResult3 = update({ component: tile }, {
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

    // Update x and y attribute types, then revert
    expect(update({ component: tile }, { xAttributeType: "categorical", yAttributeType: "numeric" }).success).toBe(true)
    expect(dataConfig.attributeDescriptionForRole("x")?.type).toBe("categorical")
    expect(dataConfig.attributeDescriptionForRole("y")?.type).toBe("numeric")
    expect(update({ component: tile }, { xAttributeType: "numeric", yAttributeType: "categorical" }).success).toBe(true)

    // We have to set a numeric x attribute before we can set the rightNumeric attribute
    update({ component: tile }, { rightNumericAttributeID: toV2Id(a3.id) })
    expect(dataConfig.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)

    // Update y2 attribute type, then revert
    expect(update({ component: tile }, { y2AttributeType: "categorical" }).success).toBe(true)
    expect(dataConfig.attributeDescriptionForRole("rightNumeric")?.type).toBe("categorical")
    expect(update({ component: tile }, { y2AttributeType: "numeric" }).success).toBe(true)

    // Update to remove y attributes
    const updateResultRemoveYs = update({ component: tile }, { yAttributeNames: [] as string[] } as V2Graph)
    expect(updateResultRemoveYs.success).toBe(true)
    expect(dataConfig._yAttributeDescriptions.length).toBe(0)

    // Update to set multiple y attributes with names
    const updateResultYNames = update({ component: tile }, { yAttributeNames: [a4.name, a3.name] } as V2Graph)
    expect(updateResultYNames.success).toBe(true)
    expect(dataConfig._yAttributeDescriptions.length).toBe(2)
    expect(dataConfig._yAttributeDescriptions[0].attributeID).toBe(a4.id)
    expect(dataConfig._yAttributeDescriptions[1].attributeID).toBe(a3.id)

    // Update to set y attributes with ids; setting numeric y attribute results in scatter plot
    const updateResultYIDs = update({ component: tile }, { yAttributeIDs: [toV2Id(a3.id)] } as V2Graph)
    expect(updateResultYIDs.success).toBe(true)
    expect(dataConfig._yAttributeDescriptions.length).toBe(1)
    expect(dataConfig._yAttributeDescriptions[0].attributeID).toBe(a3.id)

    // Update many of a graph's options
    const updateResultOptions = update({ component: tile }, {
      backgroundColor, displayOnlySelectedCases, filterFormula, hiddenCases: _hiddenCases.map(id => toV2Id(id)),
      pointColor, pointSize, strokeColor, transparent
    })
    expect(updateResultOptions.success).toBe(true)
    expect(tileContent.plotBackgroundColor).toBe(backgroundColor)
    expect(dataConfig.displayOnlySelectedCases).toBe(displayOnlySelectedCases)
    expect(dataConfig.filterFormula?.display).toBe(filterFormula)
    expect(dataConfig.hiddenCases.length).toBe(_hiddenCases.length)
    for (let i = 0; i < _hiddenCases.length; i++) {
      expect(dataConfig.hiddenCases[i]).toBe(_hiddenCases[i])
    }
    expect(tileContent.plotType).toBe(updatedPlotType)
    expect(tileContent.pointDescription.pointColor).toBe(pointColor)
    expect(tileContent.pointDescription.pointSizeMultiplier).toBe(pointSize)
    expect(tileContent.pointDescription.pointStrokeColor).toBe(strokeColor)
    expect(tileContent.isTransparent).toBe(transparent)

    // Update strokeSameAsFill (which overrides strokeColor)
    expect(update({ component: tile }, { strokeSameAsFill }).success).toBe(true)
    expect(tileContent.pointDescription.pointStrokeSameAsFill).toBe(strokeSameAsFill)

    // Get graph
    testGetComponent(tile, handler, (graphTile, values) => {
      const {
        backgroundColor: _backgroundColor, dataContext, displayOnlySelectedCases: _displayOnlySelectedCases,
        enableNumberToggle, filterFormula: _filterFormula, hiddenCases: hc, numberToggleLastMode, captionAttributeID,
        captionAttributeName, legendAttributeID, legendAttributeName, pointColor: _pointColor,
        plotType: _plotType, pointSize: _pointSize, primaryAxis,
        rightSplitAttributeID, rightSplitAttributeName,
        strokeColor: _strokeColor, strokeSameAsFill: _strokeSameAsFill, topSplitAttributeID, topSplitAttributeName,
        transparent: _transparent, xAttributeID, xAttributeName, xAttributeType: _xAttributeType, xLowerBound,
        xUpperBound, yAttributeID, yAttributeIDs, yAttributeName, yAttributeNames, yLowerBound, yUpperBound,
        y2AttributeID, y2AttributeName, y2AttributeType: _y2AttributeType, y2LowerBound, y2UpperBound
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
      expect(_xAttributeType).toBe("numeric")
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
      expect(_y2AttributeType).toBe("numeric")
      expect(y2LowerBound).toBe(y2Axis.min)
      expect(y2UpperBound).toBe(y2Axis.max)

      const primaryRole = dataConfiguration.primaryRole
      expect(primaryRole).toBe(primaryAxis)

      expect(_backgroundColor).toBe(backgroundColor)
      expect(_displayOnlySelectedCases).toBe(displayOnlySelectedCases)
      expect(_filterFormula).toBe(filterFormula)
      expect(hc?.length).toBe(_hiddenCases.length)
      for (let i = 0; i < _hiddenCases.length; i++) {
        expect(hc?.[i]).toBe(toV2Id(_hiddenCases[i]))
      }
      expect(_plotType).toBe(updatedPlotType)
      expect(_pointColor).toBe(pointColor)
      expect(_pointSize).toBe(pointSize)
      expect(_strokeColor).toBe(pointColor) // strokeSameAsFill overrides strokeColor
      expect(_strokeSameAsFill).toBe(strokeSameAsFill)
      expect(_transparent).toBe(transparent)
      expect(primaryAxis).toBe("x")
    })

    // Create multiple graphs for the same dataset
    const result2 = create({}, { type: "graph", dataContext: "data", xAttributeName: "a3", y2AttributeName: "a3" })
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
