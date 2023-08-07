import {useEffect} from "react"
import {DotsElt} from "../../data-display/d3-types"
import {MapController} from "../models/map-controller"
import {IMapContentModel} from "../models/map-content-model"

export interface IUseMapControllerProps {
  mapController: MapController,
  mapModel?: IMapContentModel,
  dotsElement: DotsElt
}

export const useMapController = ({mapController, mapModel, dotsElement}: IUseMapControllerProps) => {
  useEffect(() => {
    mapModel && mapController.setProperties({mapModel, dotsElement})
  }, [mapController, mapModel, dotsElement])
}
