import { useEffect } from "react"
import { when } from "mobx"
import { useMapEvents, useMap } from "react-leaflet"
import { DEBUG_MAP, debugLog } from "../../../lib/debug"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { useDataDisplayLayout } from "../../data-display/hooks/use-data-display-layout"
import { kDefaultMapZoomForGeoLocation } from "../map-types"
import { useMapModelContext } from "./use-map-model-context"

export function useMapModel() {
  const leafletMap = useMap()
  const mapModel = useMapModelContext()
  const layout = useDataDisplayLayout()
  const { tile } = useTileModelContext()

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
    const disposers: (() => void)[] = []
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
    // true. We need to wait for this to be complete to avoid auto-positioning the map prematurely.
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
    // and position, so the aspect ratio of the map is not known by Leaflet until the animation
    // completes.
    // The check above is not waiting for this animation to complete. This is intentional because the
    // animating map looks better when its zoom and center are set while it is animating.
    // So instead of having the cases above wait for the animation complete, we use a MobX `when`
    // below to wait for this animation only in this specific case.
    //
    // NOTE: the animation in this case could be improved by computing the map center and zoom using a fake
    // map with the final size. However that seems more complicated so doesn't seem worth it.
    else {
      const rescaleDisposer = when(
        () => !!tile?.transitionComplete,
        () => {
          // Make sure the map still has no zoom and still has layers
          if (mapModel.zoom < 0 && mapModel.layers.length > 0) {
            mapModel.rescale()
          }
        }
      )

      disposers.push(rescaleDisposer)
    }
    mapModel.setHasBeenInitialized()

    return () => {
      disposers.forEach(disposer => disposer())
    }
  },
  // Because we are setting mapModel.isLeafletMapInitialized and this code is skipped when
  // isLeafletMapInitialized is set, it is better to not include it in the dependencies.
  // Doing so would just cause an extra unnecessary render since the dependencies are observed
  // by the component using this hook.
  [layout.isTileExtentInitialized, leafletMap, mapModel, mapModel.isSharedDataInitialized, tile])
}
