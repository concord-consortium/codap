import { getSnapshot } from "mobx-state-tree"
import { kGraphIdPrefix } from "../../components/graph/graph-defs"
import "../../components/graph/graph-registration"
import { IGraphContentModel, isGraphContentModel } from "../../components/graph/models/graph-content-model"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { DIComponentInfo } from "../data-interactive-types"
import { diComponentHandler } from "./component-handler"
import { setupTestDataset } from "./handler-test-utils"


describe("DataInteractive ComponentHandler Graph", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!
  const { dataset, a1, a2, a3 } = setupTestDataset()
  documentContent.createDataSet(getSnapshot(dataset))

  it("create graph works", () => {
    // Create a graph tile with no options
    expect(documentContent.tileMap.size).toBe(0)
    const vanillaResult = handler.create?.({}, { type: "graph" })!
    expect(vanillaResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const vanillaResultValues = vanillaResult.values as DIComponentInfo
    const vanillaTile = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, vanillaResultValues.id!))!
    expect(vanillaTile).toBeDefined()
    expect(isGraphContentModel(vanillaTile.content)).toBe(true)

    // Delete a graph tile
    const deleteResult = handler.delete?.({ component: vanillaTile })!
    expect(deleteResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(0)

    // Create a graph with options
    const result = handler.create?.({}, {
      type: "graph", cannotClose: true, dataContext: "data", xAttributeName: "a1", yAttributeName: "a2",
      y2AttributeName: "a3", legendAttributeName: "a1", captionAttributeName: "a2", rightNumericAttributeName: "a3",
      rightSplitAttributeName: "a1", topSplitAttributeName: "a2", enableNumberToggle: true, numberToggleLastMode: true
    })!
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(isGraphContentModel(tile.content)).toBe(true)
    const tileContent = tile.content as IGraphContentModel
    expect(tile.cannotClose).toBe(true)

    // TODO There's currently a setTimeout when assigning options in the create handler, requiring one here.
    // Remove this setTimeout once the correct method is determined for the create handler.
    setTimeout(() => {
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("x")?.attributeID).toBe(a1.id)
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("y")?.attributeID).toBe(a2.id)
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("yPlus")?.attributeID).toBe(a3.id)
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("legend")?.attributeID).toBe(a1.id)
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("caption")?.attributeID).toBe(a2.id)
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("rightNumeric")?.attributeID).toBe(a3.id)
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("rightSplit")?.attributeID).toBe(a1.id)
      expect(tileContent.dataConfiguration.attributeDescriptionForRole("topSplit")?.attributeID).toBe(a2.id)
      expect(tileContent.showParentToggles).toBe(true)
      // Make sure numberToggleLastMode hid all appropriate cases
      tileContent.layers.forEach(layer => {
        const lastCaseId = dataset.cases[dataset.cases.length - 1]?.__id__
        dataset.cases.forEach(aCase => {
          expect(layer.dataConfiguration.hiddenCases.includes(aCase.__id__)).toBe(aCase.__id__ !== lastCaseId)
        })
      })
    })

    // Create multiple graphs for the same dataset
    const result2 = handler.create?.({}, { type: "graph", dataContext: "data" })!
    expect(result2.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(2)
    const result2Values = result2.values as DIComponentInfo
    const tile2 = documentContent.tileMap.get(toV3Id(kGraphIdPrefix, result2Values.id!))!
    expect(tile2).toBeDefined()
    expect(isGraphContentModel(tile2.content)).toBe(true)
  })
})
