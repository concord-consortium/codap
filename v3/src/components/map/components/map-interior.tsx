import {observer} from "mobx-react-lite"
import React, {useCallback} from "react"
import {PixiPoints} from "../../data-display/pixi/pixi-points"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useMapModel} from "../hooks/use-map-model"
import {kMapPointLayerType, kMapPolygonLayerType} from "../map-types"
import {isMapPointLayerModel} from "../models/map-point-layer-model"
import {MapPointLayer} from "./map-point-layer"
import {isMapPolygonLayerModel} from "../models/map-polygon-layer-model"
import {MapPolygonLayer} from "./map-polygon-layer"
import { DataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"

interface IProps {
  pixiPointsArrayRef:  React.MutableRefObject<PixiPoints[]>
}

export const MapInterior = observer(function MapInterior({pixiPointsArrayRef}: IProps) {
  const mapModel = useMapModelContext()

  useMapModel()

  const onSetPixiPointsForLayer = useCallback((pixiPoints: PixiPoints, layerIndex: number) => {
    pixiPointsArrayRef.current[layerIndex] = pixiPoints
  }, [pixiPointsArrayRef])

  /**
   * Note that we don't have to worry about layer order because polygons will be sent to the back
   */
  const renderMapLayerComponents = () => {
    return mapModel?.layers.map((layerModel, index) => {
      if (isMapPointLayerModel(layerModel)) {
        return <DataConfigurationContext.Provider
                 key={`${kMapPointLayerType}-${index}`}
                 value={layerModel.dataConfiguration}
               >
                 <MapPointLayer
                   mapLayerModel={layerModel}
                   onSetPixiPointsForLayer={onSetPixiPointsForLayer}
                 />
               </DataConfigurationContext.Provider>
      }
      else if (isMapPolygonLayerModel(layerModel)) {
        return <MapPolygonLayer
          key ={`${kMapPolygonLayerType}-${index}`}
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
