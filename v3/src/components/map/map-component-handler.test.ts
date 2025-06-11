import { getSnapshot } from "mobx-state-tree"
import { V2Map } from "../../data-interactive/data-interactive-component-types"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { testGetComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { kMapIdPrefix } from "./map-defs"
import "./map-registration"
import { IMapContentModel, isMapContentModel } from "./models/map-content-model"


describe("DataInteractive ComponentHandler Map", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!
  const { dataset } = setupTestDataset()
  documentContent.createDataSet(getSnapshot(dataset))

  it("create and get map work", async () => {
    // Create a map tile with no options
    expect(documentContent.tileMap.size).toBe(0)
    const vanillaResult = handler.create!({}, { type: "map" })
    expect(vanillaResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const vanillaResultValues = vanillaResult.values as DIComponentInfo
    const vanillaTile = documentContent.tileMap.get(toV3Id(kMapIdPrefix, vanillaResultValues.id!))!
    expect(vanillaTile).toBeDefined()
    expect(isMapContentModel(vanillaTile.content)).toBe(true)

    // Delete a map tile
    const deleteResult = handler.delete!({ component: vanillaTile })
    expect(deleteResult.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(0)

    // Create a map with options
    const result = handler.create!({}, {
      type: "map", title: "map2024", cannotClose: true, center: [20, 24], zoom: 3, legendAttributeName: "a1"
    })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kMapIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(isMapContentModel(tile.content)).toBe(true)
    const tileContent = tile.content as IMapContentModel
    expect(tile.cannotClose).toBe(true)
    expect(tile.title).toBe("map2024")
    expect(tileContent.center.lat).toBe(20)
    expect(tileContent.center.lng).toBe(24)
    expect(tileContent.zoom).toBe(3)
    // TODO Layers are not being set up properly in the test. Figure out how to set them up so
    // the legend attribute gets properly assigned. Probably only one of the following two checks will be necessary.
    // expect(tileContent.dataConfiguration?.attributeDescriptionForRole("legend")?.attributeID).toBe(a1.id)
    // expect(tileContent.layers.find(layer => layer.dataConfiguration.attributeID("legend") === a1.id)).toBeDefined()

    testGetComponent(tile, handler, (mapTile, values) => {
      const { dataContext } = values as V2Map
      expect(dataContext).toBe((mapTile.content as IMapContentModel).dataConfiguration?.dataset?.name)
    })

    const updateResult = handler.update!({ component: tile }, {
      center: [30, 34], zoom: 4, legendAttributeName: "a2"
    })
    expect(updateResult.success).toBe(true)
    expect(tileContent.center.lat).toBe(30)
    expect(tileContent.center.lng).toBe(34)
    expect(tileContent.zoom).toBe(4)
    // TODO Test that the legend attribute is updated. See above TODO for more details.
    // expect(tileContent.dataConfiguration?.attributeDescriptionForRole("legend")?.attributeID).toBe("a2")

    // Can update just the zoom without modifying the center
    const updateResult2 = handler.update!({ component: tile }, { zoom: 5 })
    expect(updateResult2.success).toBe(true)
    expect(tileContent.center.lat).toBe(30)
    expect(tileContent.center.lng).toBe(34)
    expect(tileContent.zoom).toBe(5)
  })
})
