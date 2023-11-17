import {useEffect} from "react"
import {latLng} from 'leaflet'
import {useMap} from "react-leaflet"
import {DotsElt} from "../../data-display/d3-types"
import {kDefaultMapZoomForGeoLocation} from "../map-types"
import {IMapContentModel} from "../models/map-content-model"
import {fitMapBoundsToData} from "../utilities/map-utils"

interface IProps {
  mapModel: IMapContentModel
  dotsElement: DotsElt
  instanceId: string | undefined
}

export function useMapModel(props: IProps) {
  const {mapModel} = props,
    leafletMap = useMap()

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
      // Wait for leaflet to render the map before fitting the bounds
      // Todo: See if we can instead wait for the map to be ready
      setTimeout(() => {
        fitMapBoundsToData(mapModel.layers, leafletMap)
      }, 100)
    }
    mapModel.setHasBeenInitialized()
  }, [leafletMap, mapModel, mapModel.layers])

}
