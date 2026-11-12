import { getSnapshot } from "mobx-state-tree"
import { MapHotSpotModel } from "./map-hot-spot-model"
import { MapPointLayerModel } from "./map-point-layer-model"

describe("MapHotSpotModel", () => {
  it("is hidden by default and can be shown", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.isVisible).toBe(false)
    hotSpot.setIsVisible(true)
    expect(hotSpot.isVisible).toBe(true)
  })

  it("is created with each point layer and round-trips through its snapshot", () => {
    const layer = MapPointLayerModel.create()
    expect(layer.hotSpotModel.isVisible).toBe(false)
    layer.hotSpotModel.setIsVisible(true)
    const restored = MapPointLayerModel.create(getSnapshot(layer))
    expect(restored.hotSpotModel.isVisible).toBe(true)
  })
})
