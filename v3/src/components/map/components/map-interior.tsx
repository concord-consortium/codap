import {observer} from "mobx-react-lite"
import React from "react"
import {MapController} from "../models/map-controller"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useMapModel} from "../hooks/use-map-model"
import {kMapPointLayerType} from "../models/map-point-layer-model"
import {MapPointLayer} from "./map-point-layer"

import "./map.scss"

interface IProps {
  mapController: MapController
  dotsElement: SVGSVGElement | null
}

export const MapInterior = observer(function MapInterior({mapController, dotsElement}: IProps) {
  const mapModel = useMapModelContext(),
    {enableAnimation} = mapController,
    instanceId = useInstanceIdContext()

  useMapModel({dotsElement, mapModel, enableAnimation, instanceId})

  const renderMapLayerComponents = () => {
    return mapModel?.layers.map((layerModel, index) => {
      if (layerModel.type === kMapPointLayerType) {
        return <MapPointLayer
          key={`${kMapPointLayerType}-${index}`}
          mapLayerModel={layerModel}
          dotsElement={dotsElement}
          enableAnimation={enableAnimation}
        />
      }
    })
  }

  return (
    <>
      {renderMapLayerComponents()}
    </>
  )
})
