import {comparer, reaction} from "mobx"
import {useCallback, useEffect} from "react"
import {latLng} from 'leaflet'
import {useMap} from "react-leaflet"
import {useMapModelContext} from "./use-map-model-context"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {kDefaultMapZoomForGeoLocation} from "../map-types"
import {fitMapBoundsToData} from "../utilities/map-utils"

export function useMapModel() {
  const leafletMap = useMap(),
    mapModel = useMapModelContext(),
    layout = useDataDisplayLayout()

  const initializeLeafletMapHandlers = useCallback(function initializeLeafletMapHandlers() {
    const onLayerAdd = () => {
        console.log('onLayerAdd')
      },
      onDisplayChangeEvent = () => {
        mapModel.syncCenterAndZoom()
      },
      onClick = () => {
        mapModel.layers.forEach((layer) => {
          layer.dataConfiguration.dataset?.setSelectedCases([])
        })
      },
      onMapIsChanging = () => {
        mapModel.incrementDisplayChangeCount()
      }

    leafletMap.on('layeradd', onLayerAdd)
      .on('click', onClick)
      .on('drag move zoom', onMapIsChanging)
      .on('dragend zoomend moveend', onDisplayChangeEvent)
    mapModel.setLeafletMap(leafletMap)
  }, [leafletMap, mapModel])

  // Initialize
  useEffect(function initializeLeafletMapView() {
    // wait until tile has its correct size before initializing the map
    if (!layout.isTileExtentInitialized || mapModel.hasBeenInitialized) {
      return
    }
    if (mapModel.zoom >= 0) {
      const storedCenter = mapModel.center,
        center = latLng(storedCenter?.get('lat') ?? 0,
          storedCenter?.get('lng') ?? 0)
      leafletMap.setView(center, mapModel.zoom)
    } else if (mapModel.layers.length === 0) {
      if (navigator.geolocation?.getCurrentPosition) {
        navigator.geolocation.getCurrentPosition(
          (pos: GeolocationPosition) => {
            const coords = pos.coords
            mapModel.leafletMap?.setView([coords.latitude, coords.longitude],
              kDefaultMapZoomForGeoLocation, {animate: true})
          }
        )
      }
    } else {
      fitMapBoundsToData(mapModel.layers, leafletMap)
    }
    // set up handlers after map has been initialized
    initializeLeafletMapHandlers()
    mapModel.setHasBeenInitialized()
  }, [initializeLeafletMapHandlers, layout.isTileExtentInitialized, leafletMap, mapModel, mapModel.layers])

  // Respond to content width and height changes
  useEffect(function updateMapSize() {
    const disposer = reaction(
      () => [layout.tileWidth, layout.tileHeight],
      () => leafletMap.invalidateSize(),
      {name: "MapContentModel.updateMapSize", equals: comparer.structural}
    )
    return () => disposer()
  }, [leafletMap, layout])
}
