import { useEffect } from "react"
import L from "leaflet"
import { useMapEvents, useMap } from "react-leaflet"
import { DEBUG_MAP, debugLog } from "../../../lib/debug"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { getTileInfo } from "../../../models/document/tile-utils"
import { useDataDisplayLayout } from "../../data-display/hooks/use-data-display-layout"
import { kTitleBarHeight } from "../../constants"
import { kDefaultMapZoomForGeoLocation, kMapBoundsExtensionFactor, kMaxZoomForFitBounds } from "../map-types"
import { expandLatLngBounds } from "../utilities/map-utils"
import { useMapModelContext } from "./use-map-model-context"

export function useMapModel() {
  const leafletMap = useMap()
  const mapModel = useMapModelContext()
  const layout = useDataDisplayLayout()
  const { tile } = useTileModelContext()

  // Expose the leaflet map object in the global window object
  // This helps with debugging and allows Cypress to check the map state
  if (((window as any).Cypress || DEBUG_MAP) && tile?.id) {
    const leafletMaps: any = (window as any).leafletMaps  || ({} as Record<string, any>)
    ;(window as any).leafletMaps = leafletMaps
    leafletMaps[tile.id] = mapModel.leafletMapState.leafletMap
  }

  useEffect(function initializeLeafletMap() {
    mapModel.setLeafletMap(leafletMap)
  }, [leafletMap, mapModel])

  useMapEvents({
    "layeradd": () => {
      debugLog(DEBUG_MAP, 'onLayerAdd')
    },
  })

  // Initialize
  useEffect(function initializeLeafletMapView() {
    // wait until everything is ready before initializing the map
    if (mapModel.isLeafletMapInitialized || !layout.isTileExtentInitialized || !mapModel.isSharedDataInitialized) {
      return
    }
    // If the map already has a center/zoom, then use it
    if (mapModel.zoom >= 0) {
      const { center: { lat, lng } } = mapModel
      mapModel.leafletMapState.adjustMapView({ center: [lat, lng], zoom: mapModel.zoom })
    }
    // In a newly created map, layers can be added automatically in MapContentModel's sharedDataSets
    // reaction. We've waited for that to be complete by making sure isSharedDataInitialized is
    // true. We need to wait for it to avoid auto-positioning the map prematurely.
    else if (mapModel.layers.length === 0) {
      // Auto-position to the user's current position, if available
      navigator.geolocation.getCurrentPosition?.((pos: GeolocationPosition) => {
        const { coords: { latitude, longitude }} = pos
        mapModel.leafletMapState.adjustMapView({
          center: [latitude, longitude],
          zoom: kDefaultMapZoomForGeoLocation,
          animate: true
        })
      })
    }
    // When a newly create map is added to the document and there are datasets with map data, we
    // want to rescale the map to fit the bounds of this data. However the calculation of the map
    // center and zoom that fits the data requires knowing the map's final aspect ratio.
    // When a newly created map is added to the document, sometimes it is animated into its final size
    // and position, so the aspect ratio of the map is not correct until the animation completes.
    // This problem is solved by using a temporary Leaflet map which is the final size to get the
    // center and zoom that fits the data.
    // See map.md for more details.
    else {
      const { dimensions } = tile ? getTileInfo(tile.id) : {}
      const bounds = mapModel.latLongBounds

      if (!dimensions || !bounds?.isValid()) {
        console.warn("Cannot determine tile dimensions or data bounds for map. Cannot auto-fit map to data.",
          { dimensions, bounds, isValid: bounds?.isValid() }
        )
        return
      }

      const width = dimensions.width
      // NOTE: this isn't perfect because when the API creates a new map tile it might specify a legend
      // that will reduce the height of the map further. That calculation is done by the
      // DataDisplayLayout, but it needs the legends to be rendered to know their height.
      const height = Math.max(0, dimensions.height - kTitleBarHeight)

      const extendedBounds = expandLatLngBounds(bounds, kMapBoundsExtensionFactor)

      const div = document.createElement('div')
      div.style.width = `${width}px`
      div.style.height = `${height}px`
      div.style.visibility = 'hidden'
      document.body.appendChild(div)

      const tempMap = L.map(div, { center: [0, 0], zoom: 0, zoomSnap: 0 })
      tempMap.fitBounds(extendedBounds, { animate: false, maxZoom: kMaxZoomForFitBounds })
      const zoom = tempMap.getZoom()
      const center = tempMap.getCenter()
      tempMap.remove()
      document.body.removeChild(div)

      debugLog(DEBUG_MAP, "Auto-positioning map on initialization", {
        width, height, zoom, center, bounds: bounds.toBBoxString()
      })

      mapModel.leafletMapState.adjustMapView({ center, zoom })
    }
    mapModel.setHasBeenInitialized()
  },
  // Because we are setting mapModel.isLeafletMapInitialized and this code is skipped when
  // isLeafletMapInitialized is set, it is better to not include it in the dependencies.
  // Doing so would just cause an extra unnecessary render since the dependencies are observed
  // by the component using this hook.
  [layout.isTileExtentInitialized, leafletMap, mapModel, mapModel.isSharedDataInitialized, tile])
}
