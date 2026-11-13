import { act, render } from "@testing-library/react"
import { Map as LeafletMap } from "leaflet"
import { MapContainer } from "react-leaflet"
import { featureFlagManager } from "../../../models/feature-flags/feature-flag-manager"
import { IMapPointLayerModel, MapPointLayerModel } from "../models/map-point-layer-model"
import { kHotSpotPaneName, MapHotSpotLayer } from "./map-hot-spot-layer"

describe("MapHotSpotLayer", () => {
  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  function mountHotSpotLayer(setup?: (pointLayer: IMapPointLayerModel) => void) {
    const pointLayer = MapPointLayerModel.create()
    pointLayer.hotSpotModel.setIsVisible(true)
    setup?.(pointLayer)
    let leafletMap: LeafletMap | null = null
    render(
      <MapContainer ref={map => { leafletMap = map }} center={[0, 0]} zoom={1}>
        <MapHotSpotLayer mapPointLayerModel={pointLayer}/>
      </MapContainer>
    )
    return { leafletMap: leafletMap as unknown as LeafletMap, pointLayer }
  }

  // eslint-disable-next-line testing-library/no-node-access -- the canvas is created by Leaflet, not React
  const hotSpotCanvas = (leafletMap: LeafletMap) => leafletMap.getPane(kHotSpotPaneName)?.querySelector("canvas")

  it("does not create the hot spot pane when the mapHotSpot flag is off", () => {
    const { leafletMap } = mountHotSpotLayer()
    expect(leafletMap.getPane(kHotSpotPaneName)).toBeUndefined()
  })

  it("places the hot spot pane immediately above the boundaries and below the other overlay panes", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { leafletMap } = mountHotSpotLayer()
    const hotSpotPane = leafletMap.getPane(kHotSpotPaneName)
    expect(hotSpotPane).toBeDefined()

    // CODAP gives every .leaflet-pane the same z-index, so DOM order determines stacking
    const { mapPane, overlayPane, shadowPane, markerPane, tooltipPane, popupPane } = leafletMap.getPanes()
    // eslint-disable-next-line testing-library/no-node-access -- verifying Leaflet pane DOM order
    const paneOrder = Array.from(mapPane.children)
    const indexOf = (pane?: HTMLElement) => paneOrder.indexOf(pane as Element)
    const hotSpotIndex = indexOf(hotSpotPane)

    // after the boundaries (overlayPane)...
    expect(hotSpotIndex).toBeGreaterThan(indexOf(overlayPane))
    // ...and beneath everything Leaflet draws on top of the overlays
    for (const pane of [shadowPane, markerPane, tooltipPane, popupPane]) {
      expect(hotSpotIndex).toBeLessThan(indexOf(pane))
    }
  })
  it("adds a hot spot canvas when shown and removes it when hidden", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { leafletMap, pointLayer } = mountHotSpotLayer()
    expect(hotSpotCanvas(leafletMap)).toBeTruthy()
    act(() => pointLayer.hotSpotModel.setIsVisible(false))
    expect(hotSpotCanvas(leafletMap)).toBeFalsy()
  })

  it("shows hot spots even when the points are hidden", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { leafletMap } = mountHotSpotLayer(pointLayer => pointLayer.setPointsAreVisible(false))
    expect(hotSpotCanvas(leafletMap)).toBeTruthy()
  })

  it("applies the hot spot opacity to the canvas", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { leafletMap } = mountHotSpotLayer()
    expect(hotSpotCanvas(leafletMap)?.style.opacity).toBe("0.75")
  })
})
