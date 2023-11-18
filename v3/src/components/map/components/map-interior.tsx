import {observer} from "mobx-react-lite"
import React from "react"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useMapModel} from "../hooks/use-map-model"
import {isMapPointLayerModel, kMapPointLayerType} from "../models/map-point-layer-model"
import {MapPointLayer} from "./map-point-layer"
import {isMapPolygonLayerModel} from "../models/map-polygon-layer-model"
import {MapPolygonLayer} from "./map-polygon-layer"

export const MapInterior = observer(function MapInterior() {
  const mapModel = useMapModelContext()

  useMapModel()

  /**
   * Note that we don't have to worry about layer order because polygons will be sent to the back
   */
  const renderMapLayerComponents = () => {
    return mapModel?.layers.map((layerModel, index) => {
      if (isMapPointLayerModel(layerModel)) {
        return <MapPointLayer
          key={`${kMapPointLayerType}-${index}`}
          mapLayerModel={layerModel}
        />
      }
      else if (isMapPolygonLayerModel(layerModel)) {
        return <MapPolygonLayer
          key ={`${kMapPointLayerType}-${index}`}
          mapLayerModel={layerModel}
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
