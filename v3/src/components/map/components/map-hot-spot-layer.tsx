import { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Map as LeafletMap, rectangle } from "leaflet"
import { useMap } from "react-leaflet"
import { isFeatureEnabled } from "../../../models/feature-flags/feature-flag-manager"
import { IMapPointLayerModel } from "../models/map-point-layer-model"

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
  const show = isFeatureEnabled("mapHotSpot") && isVisible && hotSpotModel.isVisible

  useEffect(() => {
    if (!show) return
    getHotSpotPane(leafletMap)
    // TEMPORARY placeholder: a translucent white plane over the whole world (with longitudes
    // widened to cover repeated world copies at low zoom). Replace with real hot spot rendering.
    const placeholder = rectangle([[-90, -720], [90, 720]], {
      pane: kHotSpotPaneName, interactive: false, stroke: false, fillColor: "white", fillOpacity: 0.5
    }).addTo(leafletMap)
    return () => { placeholder.remove() }
  }, [leafletMap, show])

  return null
})
