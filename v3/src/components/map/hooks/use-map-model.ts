import {useEffect} from "react"
import {useMapEvents, useMap} from "react-leaflet"
import {useMapModelContext} from "./use-map-model-context"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {kDefaultMapZoomForGeoLocation} from "../map-types"
import {DEBUG_MAP, debugLog} from "../../../lib/debug"

export function useMapModel() {
  const leafletMap = useMap(),
    mapModel = useMapModelContext(),
    layout = useDataDisplayLayout()

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
    // reaction. We wait to perform the map initialization until this has been completed to avoid
    // auto-positioning the map prematurely.
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
    // If the map doesn't have a position but does have data, then scale to fit the data.
    else {
      mapModel.rescale()
    }
    mapModel.setHasBeenInitialized()
  }, [layout.isTileExtentInitialized, leafletMap, mapModel, mapModel.isSharedDataInitialized])
}
