import {useEffect} from "react"
import {IDotsRef} from "../../data-display/data-display-types"
import {MapController} from "../models/map-controller"
import {IMapContentModel} from "../models/map-content-model"

export interface IUseMapControllerProps {
  mapController: MapController,
  mapContentModel?: IMapContentModel,
  dotsRef: IDotsRef
}

export const useMapController = ({mapController, mapContentModel, dotsRef}: IUseMapControllerProps) => {
  useEffect(() => {
    mapContentModel && mapController.setProperties({mapContentModel, dotsRef})
  }, [mapController, mapContentModel, dotsRef])
}
