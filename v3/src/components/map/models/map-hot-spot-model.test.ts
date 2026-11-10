import { observable, reaction, runInAction } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { IHotSpotSurface, kFallbackBandwidthMeters } from "../utilities/hot-spot-utils"
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

describe("MapHotSpotModel.hotSpotSurface", () => {
  const latLongs = [{ lat: 42, long: -71 }, { lat: 42, long: -71 }]

  it("is undefined without a point source or points", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.hotSpotSurface).toBeUndefined()
    hotSpot.setPointSource({ plottedLatLongs: [] })
    expect(hotSpot.hotSpotSurface).toBeUndefined()
  })

  it("uses the source's points", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setPointSource({ plottedLatLongs: latLongs })
    const surface = hotSpot.hotSpotSurface!
    expect(surface.points.map(p => p.latLong)).toEqual(latLongs)
    // the points coincide, so there's no spread and the fallback bandwidth applies
    expect(surface.bandwidthMeters).toBe(kFallbackBandwidthMeters)
    expect(surface.maxDensity).toBeCloseTo(2)
  })

  it("uses the model's bandwidth when it is set", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setPointSource({ plottedLatLongs: latLongs })
    hotSpot.setBandwidth(5000)
    expect(hotSpot.hotSpotSurface!.bandwidthMeters).toBe(5000)
  })

  it("recomputes when the source's points change", () => {
    const hotSpot = MapHotSpotModel.create()
    const source = observable({ plottedLatLongs: latLongs })
    hotSpot.setPointSource(source)
    // a fixed bandwidth, so "far apart" doesn't depend on the default computed from the points
    hotSpot.setBandwidth(5000)
    const surfaces: Array<Maybe<IHotSpotSurface>> = []
    const dispose = reaction(() => hotSpot.hotSpotSurface, surface => surfaces.push(surface))
    runInAction(() => { source.plottedLatLongs = [{ lat: 42, long: -71 }, { lat: -30, long: 120 }] })
    expect(surfaces).toHaveLength(1)
    // the two points are now far apart
    expect(surfaces[0]!.maxDensity).toBeCloseTo(1)
    dispose()
  })
})
