import {MutableRefObject, useEffect} from "react"
// eslint-disable-next-line import/no-extraneous-dependencies
import {LatLngBounds} from 'leaflet'
import {useMap} from "react-leaflet"
import {DotsElt} from "../../data-display/d3-types"
import {kDefaultMapZoomForGeoLocation} from "../map-types"
import {IMapContentModel} from "../models/map-content-model"
import {getLatLongBounds} from "../utilities/map-utils"

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
    mapModel.setLeafletMap(leafletMap)
  }, [leafletMap, mapModel])

  // Initialize
  useEffect(function initializeLeafletMap() {
    if (mapModel.layers.length === 0) {
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
      overallBounds && mapModel.leafletMap.fitBounds(overallBounds, {animate: true})
    }
  }, [mapModel.layers, mapModel.leafletMap])

}
