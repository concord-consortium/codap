import { getSnapshot } from "mobx-state-tree"
import { isDefaultHotSpotModel, MapHotSpotModel } from "./map-hot-spot-model"
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

  it("has defaults for the density display", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.bandwidth).toBeUndefined()
    expect(hotSpot.opacity).toBe(0.75)
    expect(hotSpot.lowColor).toBe("#000000")
    expect(hotSpot.highColor).toBe("#ffffff")
    expect(isDefaultHotSpotModel(hotSpot)).toBe(true)
  })

  it("is not default when a display property differs", () => {
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ bandwidth: 5000 }))).toBe(false)
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ highColor: "#ff0000" }))).toBe(false)
  })

  it("can set the display properties", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setBandwidth(5000)
    hotSpot.setOpacity(0.5)
    hotSpot.setLowColor("#0000ff")
    hotSpot.setHighColor("#ff0000")
    expect(getSnapshot(hotSpot)).toEqual(
      { isVisible: false, bandwidth: 5000, opacity: 0.5, lowColor: "#0000ff", highColor: "#ff0000" })
    hotSpot.setBandwidth(undefined)
    expect(hotSpot.bandwidth).toBeUndefined()
  })
})
