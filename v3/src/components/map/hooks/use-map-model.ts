import {MutableRefObject, useEffect} from "react"
import {useMap} from "react-leaflet"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {IDotsRef} from "../../data-display/data-display-types"
import {IMapContentModel} from "../models/map-content-model"
import {kDefaultMapZoomForGeoLocation} from "../map-types"

interface IProps {
  mapContentModel: IMapContentModel
  enableAnimation: MutableRefObject<boolean>
  dotsRef: IDotsRef
  instanceId: string | undefined
}

export function useMapModel(props: IProps) {
  const // {mapContentModel, enableAnimation, dotsRef, instanceId} = props,
    // dataConfig = mapContentModel.config,
    dataset = useDataSetContext(),
    leafletMap = useMap()

  // Initialize
  useEffect(function initializeMapModel() {
    if (!dataset) {
      if (navigator.geolocation?.getCurrentPosition) {
        navigator.geolocation.getCurrentPosition(
          (pos:GeolocationPosition) => {
            const coords = pos.coords
            leafletMap.setView([coords.latitude, coords.longitude], kDefaultMapZoomForGeoLocation, {animate: true})
          }
        )
      }
    }
  }, [dataset, leafletMap])

/*
  const callMatchCirclesToData = useCallback(() => {
    matchCirclesToData({
      dataConfiguration: dataConfig,
      pointRadius: mapModel.getPointRadius(),
      pointColor: mapModel.pointColor,
      pointStrokeColor: mapModel.pointStrokeColor,
      dotsElement: dotsRef.current,
      enableAnimation, instanceId
    })
  }, [dataConfig, mapModel, dotsRef, enableAnimation, instanceId])
*/

/*
  // respond to point properties change
  useEffect(function respondToMapPointVisualAction() {
    const disposer = onAnyAction(mapModel, action => {
      if (isMapVisualPropsAction(action)) {
        callMatchCirclesToData()
      }
    })
    return () => disposer()
  }, [callMatchCirclesToData, mapModel])
*/

}
