import {MutableRefObject, useEffect} from "react"
// eslint-disable-next-line import/no-extraneous-dependencies
import {latLng, LatLngBounds} from 'leaflet'
import {useMap} from "react-leaflet"
import {DotsElt} from "../../data-display/d3-types"
import {kDefaultMapZoomForGeoLocation} from "../map-types"
import {IMapContentModel} from "../models/map-content-model"
import {expandLatLngBounds, getLatLongBounds} from "../utilities/map-utils"

interface IProps {
  mapModel: IMapContentModel
  enableAnimation: MutableRefObject<boolean>
  dotsElement: DotsElt
  instanceId: string | undefined
}

export function useMapModel(props: IProps) {
  const {mapModel} = props,
    leafletMap = useMap()

  // Initialize
  useEffect(function initializeLeafletMap() {
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
      }/*,
      onEndDragMove = () => {
        mapModel.incrementDisplayChangeCount()
      }*/

    leafletMap.on('layeradd', onLayerAdd)
      .on('click', onClick)
      .on('drag move zoom', onMapIsChanging)
      .on('load dragend zoomend moveend', onDisplayChangeEvent)
    mapModel.setLeafletMap(leafletMap)
  }, [leafletMap, mapModel])

  // Initialize
  useEffect(function initializeLeafletMap() {
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
      let overallBounds: LatLngBounds | undefined = undefined
      mapModel.layers.forEach((layer) => {
        const bounds = getLatLongBounds(layer.dataConfiguration)
        if (bounds) {
          if (!overallBounds) {
            overallBounds = bounds
          } else {
            overallBounds.extend(bounds)
          }
        }
      })
      if (overallBounds) {
        mapModel.leafletMap.fitBounds(expandLatLngBounds(overallBounds, 1.1), {animate: true})
      }
    }
    mapModel.setHasBeenInitialized()
  }, [leafletMap, mapModel, mapModel.layers, mapModel.leafletMap])

}
