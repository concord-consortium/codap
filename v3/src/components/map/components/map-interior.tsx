import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect} from "react"
import {PixiPoints} from "../../data-display/pixi/pixi-points"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useMapModel} from "../hooks/use-map-model"
import {kMapPointLayerType, kMapPolygonLayerType} from "../map-types"
import {isMapPointLayerModel} from "../models/map-point-layer-model"
import {MapPointLayer} from "./map-point-layer"
import {isMapPolygonLayerModel} from "../models/map-polygon-layer-model"
import {MapPolygonLayer} from "./map-polygon-layer"
import { DataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"

interface IProps {
  pixiPointsArrayRef:  React.MutableRefObject<PixiPoints[]>
}

export const MapInterior = observer(function MapInterior({pixiPointsArrayRef}: IProps) {
  const mapModel = useMapModelContext()
  const { transitionComplete: tileTransitionComplete } = useTileModelContext()

  useMapModel()

  const onSetPixiPointsForLayer = useCallback((pixiPoints: PixiPoints, layerIndex: number) => {
    pixiPointsArrayRef.current[layerIndex] = pixiPoints
  }, [pixiPointsArrayRef])


  // Ensure the map rescales when its tile's CSS transition is complete to compensate for any changes to the tile's
  // size that may have occurred after the map was initially rendered.
  useEffect(function rescaleOnTileTransitionEnd() {
    if (tileTransitionComplete) {
      mapModel.rescale()
    }
  }, [tileTransitionComplete, mapModel])

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
