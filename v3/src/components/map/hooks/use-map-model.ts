import {reaction} from "mobx"
import {useEffect} from "react"
import {latLng} from 'leaflet'
import {useMap} from "react-leaflet"
import {useMapModelContext} from "./use-map-model-context"
import {useMapLayoutContext} from "../models/map-layout"
import {kDefaultMapZoomForGeoLocation} from "../map-types"
import {fitMapBoundsToData} from "../utilities/map-utils"

export function useMapModel() {
  const leafletMap = useMap(),
    mapModel = useMapModelContext(),
    layout = useMapLayoutContext()

  // Initialize
  useEffect(function initializeLeafletMapHandlers() {
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
      .on('load dragend zoomend moveend', onDisplayChangeEvent)
    mapModel.setLeafletMap(leafletMap)
  }, [leafletMap, mapModel])

  // Initialize
  useEffect(function initializeLeafletMapView() {
    if (mapModel.hasBeenInitialized) {
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
            mapModel.leafletMap.setView([coords.latitude, coords.longitude],
              kDefaultMapZoomForGeoLocation, {animate: true})
          }
        )
      }
    } else {
      fitMapBoundsToData(mapModel.layers, leafletMap)
    }
    mapModel.setHasBeenInitialized()
  }, [leafletMap, mapModel, mapModel.layers])

  // Respond to content width and height changes
  useEffect(function updateMapSize() {
    const disposer = reaction(
      () => [layout.mapWidth, layout.mapHeight],
      () => leafletMap.invalidateSize(),
      {name: "MapContentModel.updateMapSize"}
    )
    return () => disposer()
  }, [leafletMap, layout])
}
