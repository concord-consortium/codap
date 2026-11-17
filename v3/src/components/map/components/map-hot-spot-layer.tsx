import { useEffect, useRef } from "react"
import { observer } from "mobx-react-lite"
import { Map as LeafletMap } from "leaflet"
import { useMap } from "react-leaflet"
import { isFeatureEnabled } from "../../../models/feature-flags/feature-flag-manager"
import { mstReaction } from "../../../utilities/mst-reaction"
import { IMapPointLayerModel } from "../models/map-point-layer-model"
import { HotSpotCanvasLayer } from "../utilities/hot-spot-canvas-layer"
import { buildColorLUT, renderHotSpotSurface } from "../utilities/hot-spot-utils"
import { createLatLongProjector } from "../utilities/map-utils"

export const kHotSpotPaneName = "codapHotSpotPane"

/**
 * Returns the hot spot pane, creating it if necessary. The pane sits immediately after
 * Leaflet's overlayPane (which holds boundary polygons) so it draws above the boundaries.
 * The points are drawn on a canvas above the whole map pane, so they remain on top.
 * CODAP's CSS gives every .leaflet-pane the same z-index, so DOM order decides the stacking;
 * appending at the end would cover the popup pane.
 */
function getHotSpotPane(leafletMap: LeafletMap) {
  let pane = leafletMap.getPane(kHotSpotPaneName)
  if (!pane) {
    pane = leafletMap.createPane(kHotSpotPaneName)
    pane.style.pointerEvents = "none"
    leafletMap.getPanes().overlayPane.after(pane)
  }
  return pane
}

interface IProps {
  mapPointLayerModel: IMapPointLayerModel
}

export const MapHotSpotLayer = observer(function MapHotSpotLayer({ mapPointLayerModel }: IProps) {
  const leafletMap = useMap()
  const { isVisible, hotSpotModel } = mapPointLayerModel
  // Hot spots draw even when the points are hidden (pointsAreVisible), but not when the whole layer is hidden.
  // See plottedLatLongs for which cases contribute.
  const show = isFeatureEnabled("mapHotSpot") && isVisible && hotSpotModel.isVisible
  const opacity = hotSpotModel.displayOpacity
  const layerRef = useRef<HotSpotCanvasLayer>()

  useEffect(() => {
    if (!show) return

    getHotSpotPane(leafletMap)
    const layer = new HotSpotCanvasLayer({ pane: kHotSpotPaneName })
    layerRef.current = layer

    // Observing the surface keeps MobX's cached copy alive while the hot spots are shown.
    // Install this before the first draw so that draw reads the cached surface.
    const disposeReaction = mstReaction(
      () => [hotSpotModel.hotSpotSurface, hotSpotModel.lowColor, hotSpotModel.highColor],
      () => layer.redraw(),
      // Coalesce bursts of changes so that the surface is recomputed and redrawn at most once per frame
      { name: "MapHotSpotLayer.redraw", scheduler: run => requestAnimationFrame(run) },
      hotSpotModel
    )

    layer.setDrawFunction((context, region) => {
      const surface = hotSpotModel.hotSpotSurface
      if (!surface) return

      const imageData = context.createImageData(region.cols, region.rows)
      const zoomScale = leafletMap.getZoomScale(leafletMap.getZoom(), 0)
      const lut = buildColorLUT(hotSpotModel.lowColor, hotSpotModel.highColor)
      renderHotSpotSurface(surface, createLatLongProjector(leafletMap), zoomScale, region, lut, imageData.data)
      context.putImageData(imageData, 0, 0)
    })
    layer.addTo(leafletMap)

    return () => {
      disposeReaction()
      layer.remove()
      layerRef.current = undefined
    }
  }, [hotSpotModel, leafletMap, mapPointLayerModel, show])

  // Declared after the effect above so it runs after the layer is created when show turns on
  useEffect(() => {
    layerRef.current?.setOpacity(opacity)
  }, [opacity, show])

  return null
})
