import {observer} from "mobx-react-lite"
import React, {useRef} from "react"
import {IDotsRef} from "../../data-display/data-display-types"
import {MapController} from "../models/map-controller"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useMapContentModelContext} from "../models/map-content-model"
import {useMapModel} from "../hooks/use-map-model"

import "./map.scss"

interface IProps {
  mapController: MapController
  dotsRef: IDotsRef
}

export const MapInterior = observer(function MapInterior({mapController, dotsRef}: IProps) {
  const mapContentModel = useMapContentModelContext(),
    {enableAnimation} = mapController,
    instanceId = useInstanceIdContext(),
    svgRef = useRef<SVGSVGElement>(null)

  // useDataTips({dotsRef, dataset, mapContentModel, enableAnimation})

  useMapModel({dotsRef, mapContentModel, enableAnimation, instanceId})

  return (
      <svg className='map-svg' ref={svgRef}>
      </svg>
  )
})
