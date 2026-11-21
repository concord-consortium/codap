import { observable, reaction, runInAction } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { greatCircleDistance } from "../../../utilities/geo-utils"
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
    expect(hotSpot.colorRamp).toBe("heat")
    expect(hotSpot.lowColor).toBe("#fff3a3")
    expect(hotSpot.highColor).toBe("#5b1a8c")
    expect(hotSpot.colorBins).toBe("continuous")
    expect(isDefaultHotSpotModel(hotSpot)).toBe(true)
  })

  it("falls back to the default color ramp when a snapshot's ramp is unknown", () => {
    const hotSpot = MapHotSpotModel.create({ isVisible: true, colorRamp: "rainbow", lowColor: "#0000ff" })
    expect(hotSpot.colorRamp).toBe("heat")
    // the rest of the snapshot is kept
    expect(hotSpot.isVisible).toBe(true)
    expect(hotSpot.lowColor).toBe("#0000ff")
    expect(MapHotSpotModel.create({ colorRamp: "viridis" }).colorRamp).toBe("viridis")

    // a native v3 document reaches the hot spot through its point layer's snapshot
    const layer = MapPointLayerModel.create({ hotSpotModel: { colorRamp: "rainbow", opacity: 0.5 } })
    expect(layer.hotSpotModel.colorRamp).toBe("heat")
    expect(layer.hotSpotModel.opacity).toBe(0.5)
  })

  it("restores a custom color ramp with non-default low and high colors", () => {
    const hotSpot = MapPointLayerModel.create({ hotSpotModel: {
      isVisible: true, colorRamp: "custom", lowColor: "#0000ff", highColor: "#ff0000"
    }}).hotSpotModel
    expect(hotSpot.colorRamp).toBe("custom")
    expect(hotSpot.lowColor).toBe("#0000ff")
    expect(hotSpot.highColor).toBe("#ff0000")
  })

  it("is not default when a display property differs", () => {
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ bandwidth: 5000 }))).toBe(false)
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ highColor: "#ff0000" }))).toBe(false)
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ colorRamp: "viridis" }))).toBe(false)
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ colorBins: 5 }))).toBe(false)
  })

  it("can set the display properties", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setBandwidth(5000)
    hotSpot.setOpacity(0.5)
    hotSpot.setColorRamp("custom")
    hotSpot.setLowColor("#0000ff")
    hotSpot.setHighColor("#ff0000")
    hotSpot.setColorBins(5)
    expect(getSnapshot(hotSpot)).toEqual({
      isVisible: false, bandwidth: 5000, opacity: 0.5, colorRamp: "custom", lowColor: "#0000ff",
      highColor: "#ff0000", colorBins: 5
    })
    hotSpot.setBandwidth(undefined)
    expect(hotSpot.bandwidth).toBeUndefined()
  })
})

describe("MapHotSpotModel opacity", () => {
  it("uses the dynamic opacity while set and clears it when the opacity is committed", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.displayOpacity).toBe(0.75)
    hotSpot.setDynamicOpacity(0.3)
    expect(hotSpot.displayOpacity).toBe(0.3)
    expect(hotSpot.opacity).toBe(0.75)
    // the dynamic value is volatile, so it doesn't affect the snapshot
    expect(isDefaultHotSpotModel(hotSpot)).toBe(true)
    hotSpot.setOpacity(0.4)
    expect(hotSpot.dynamicOpacity).toBeUndefined()
    expect(hotSpot.displayOpacity).toBe(0.4)
  })
})

describe("MapHotSpotModel color bins", () => {
  it("uses the dynamic color bins while set and clears them when the color bins are committed", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.effectiveColorBins).toBe("continuous")
    expect(hotSpot.displayColorBins).toBe("continuous")

    hotSpot.setDynamicColorBins(4)
    expect(hotSpot.displayColorBins).toBe(4)
    expect(hotSpot.effectiveColorBins).toBe("continuous")
    expect(hotSpot.colorBins).toBe("continuous")
    // the dynamic value is volatile, so it doesn't affect the snapshot
    expect(isDefaultHotSpotModel(hotSpot)).toBe(true)

    hotSpot.setColorBins(6)
    expect(hotSpot.dynamicColorBins).toBeUndefined()
    expect(hotSpot.colorBins).toBe(6)
    expect(hotSpot.effectiveColorBins).toBe(6)
    expect(hotSpot.displayColorBins).toBe(6)
    expect(isDefaultHotSpotModel(hotSpot)).toBe(false)
  })

  it("shows continuous while it is the dynamic value, even with a number committed", () => {
    const hotSpot = MapHotSpotModel.create({ colorBins: 3 })
    hotSpot.setDynamicColorBins("continuous")
    expect(hotSpot.displayColorBins).toBe("continuous")
    expect(hotSpot.effectiveColorBins).toBe(3)
  })

  it("keeps an out-of-range count as saved but uses the nearest limit", () => {
    const tooMany = MapHotSpotModel.create({ colorBins: 15 })
    expect(tooMany.colorBins).toBe(15)
    expect(tooMany.effectiveColorBins).toBe(10)
    expect(tooMany.displayColorBins).toBe(10)
    expect(getSnapshot(tooMany).colorBins).toBe(15)

    const tooFew = MapHotSpotModel.create({ colorBins: 0 })
    expect(tooFew.colorBins).toBe(0)
    expect(tooFew.effectiveColorBins).toBe(2)
    expect(tooFew.displayColorBins).toBe(2)
    expect(getSnapshot(tooFew).colorBins).toBe(0)
  })

  it("limits an out-of-range dynamic value", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setDynamicColorBins(15)
    expect(hotSpot.displayColorBins).toBe(10)
  })

  it("falls back to continuous when a snapshot's color bins are invalid", () => {
    const hotSpot = MapHotSpotModel.create({ isVisible: true, colorBins: "many", opacity: 0.5 })
    expect(hotSpot.colorBins).toBe("continuous")
    // the rest of the snapshot is kept
    expect(hotSpot.isVisible).toBe(true)
    expect(hotSpot.opacity).toBe(0.5)
    // JSON writes NaN and Infinity as null
    expect(MapHotSpotModel.create({ colorBins: null as any }).colorBins).toBe("continuous")

    // a native v3 document reaches the hot spot through its point layer's snapshot
    const layer = MapPointLayerModel.create({ hotSpotModel: { colorBins: "many", colorRamp: "viridis" } })
    expect(layer.hotSpotModel.colorBins).toBe("continuous")
    expect(layer.hotSpotModel.colorRamp).toBe("viridis")
  })

  it("keeps a valid color ramp when the color bins are invalid, and the reverse", () => {
    expect(MapHotSpotModel.create({ colorRamp: "rainbow", colorBins: 5 }).colorBins).toBe(5)
    expect(MapHotSpotModel.create({ colorRamp: "viridis", colorBins: "many" }).colorRamp).toBe("viridis")
  })

  it("round-trips color bins through the point layer's snapshot", () => {
    const layer = MapPointLayerModel.create()
    layer.hotSpotModel.setColorBins(7)
    expect(MapPointLayerModel.create(getSnapshot(layer)).hotSpotModel.colorBins).toBe(7)
  })
})

describe("MapHotSpotModel bandwidth", () => {
  it("uses the default until a bandwidth is set and the dynamic bandwidth while one is set", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setLatLongSource({ plottedLatLongs: [{ lat: 0, long: 0 }, { lat: 1, long: 1 }, { lat: 2, long: 0 }] })
    const { defaultBandwidth } = hotSpot
    expect(defaultBandwidth).not.toBe(kFallbackBandwidthMeters)
    expect(hotSpot.effectiveBandwidth).toBe(defaultBandwidth)
    expect(hotSpot.displayBandwidth).toBe(defaultBandwidth)
    expect(hotSpot.hotSpotSurface?.bandwidthMeters).toBe(defaultBandwidth)

    hotSpot.setDynamicBandwidth(5000)
    expect(hotSpot.effectiveBandwidth).toBe(defaultBandwidth)
    expect(hotSpot.displayBandwidth).toBe(5000)
    expect(hotSpot.hotSpotSurface?.bandwidthMeters).toBe(5000)
    // the dynamic value is volatile, so it doesn't affect the snapshot
    expect(isDefaultHotSpotModel(hotSpot)).toBe(true)

    hotSpot.setBandwidth(7000)
    expect(hotSpot.dynamicBandwidth).toBeUndefined()
    expect(hotSpot.effectiveBandwidth).toBe(7000)
    expect(hotSpot.displayBandwidth).toBe(7000)
    expect(hotSpot.hotSpotSurface?.bandwidthMeters).toBe(7000)
  })
})

describe("MapHotSpotModel default bandwidth", () => {
  it("uses the default bandwidth when the bandwidth isn't positive", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setLatLongSource({ plottedLatLongs: [{ lat: 0, long: 0 }, { lat: 1, long: 1 }, { lat: 2, long: 0 }] })
    hotSpot.setBandwidth(0)
    expect(hotSpot.effectiveBandwidth).toBe(hotSpot.defaultBandwidth)
    expect(hotSpot.hotSpotSurface?.bandwidthMeters).toBe(hotSpot.defaultBandwidth)
  })
})

describe("MapHotSpotModel optimization", () => {
  it("optimizes only while the bandwidth is changing interactively", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.shouldOptimize).toBe(false)
    hotSpot.setDynamicBandwidth(5000)
    expect(hotSpot.shouldOptimize).toBe(true)
    hotSpot.setBandwidth(5000)
    expect(hotSpot.shouldOptimize).toBe(false)
  })

  it("approximates the maximum density while optimizing and computes it exactly once the bandwidth is set", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setLatLongSource({ plottedLatLongs: [{ lat: 0, long: 0 }, { lat: 0, long: 0.1 }] })
    // two points two bandwidths apart, so the maximum is between them: 2e^(−½) there, but 1 + e⁻² at each point
    const bandwidth = greatCircleDistance(0, 0, 0, 0.1) / 2

    hotSpot.setDynamicBandwidth(bandwidth)
    expect(hotSpot.hotSpotSurface!.maxDensity).toBeCloseTo(1 + Math.exp(-2), 2)

    hotSpot.setBandwidth(bandwidth)
    expect(hotSpot.hotSpotSurface!.maxDensity).toBeCloseTo(2 * Math.exp(-0.5), 2)
  })
})

describe("MapHotSpotModel.hotSpotSurface", () => {
  const latLongs = [{ lat: 42, long: -71 }, { lat: 42, long: -71 }]

  it("is undefined without a point source or points", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.hotSpotSurface).toBeUndefined()
    hotSpot.setLatLongSource({ plottedLatLongs: [] })
    expect(hotSpot.hotSpotSurface).toBeUndefined()
  })

  it("uses the source's points", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setLatLongSource({ plottedLatLongs: latLongs })
    const surface = hotSpot.hotSpotSurface!
    expect(surface.points.map(p => p.latLong)).toEqual(latLongs)
    // the points coincide, so there's no spread and the fallback bandwidth applies
    expect(surface.bandwidthMeters).toBe(kFallbackBandwidthMeters)
    expect(surface.maxDensity).toBeCloseTo(2)
  })

  it("uses the model's bandwidth when it is set", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setLatLongSource({ plottedLatLongs: latLongs })
    hotSpot.setBandwidth(5000)
    expect(hotSpot.hotSpotSurface!.bandwidthMeters).toBe(5000)
  })

  it("recomputes when the source's points change", () => {
    const hotSpot = MapHotSpotModel.create()
    const source = observable({ plottedLatLongs: latLongs })
    hotSpot.setLatLongSource(source)
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
