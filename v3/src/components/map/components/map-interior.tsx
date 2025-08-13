import {observer} from "mobx-react-lite"
import React, {useEffect} from "react"
import {PixiPoints} from "../../data-display/pixi/pixi-points"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useMapModel} from "../hooks/use-map-model"
import {kMapPinLayerType, kMapPointLayerType, kMapPolygonLayerType} from "../map-types"
import {isMapPointLayerModel} from "../models/map-point-layer-model"
import {MapPointLayer} from "./map-point-layer"
import {isMapPolygonLayerModel} from "../models/map-polygon-layer-model"
import {MapPolygonLayer} from "./map-polygon-layer"
import { DataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"
import { isMapPinLayerModel } from "../models/map-pin-layer-model"
import { MapPinLayer } from "./map-pin-layer"
import { createOrUpdateLeafletGeoRasterLayer } from "../utilities/georaster-utils"
import { mstAutorun } from "../../../utilities/mst-autorun"

interface IProps {
  setPixiPointsLayer: (pixiPoints: PixiPoints, layerIndex: number) => void
}

export const MapInterior = observer(function MapInterior({setPixiPointsLayer}: IProps) {
  const mapModel = useMapModelContext()

  useMapModel()

  // Add or update the GeoRaster layer when URL changes
  useEffect(() => {
    return mstAutorun(() => {
      // This reads the geoRaster.url from the model before going into an async task
      // so changes to the geoRaster or its url will retrigger this autorun
      createOrUpdateLeafletGeoRasterLayer(mapModel)
    }, {name: "MapInterior.mstAutorun [createOrUpdateLeafletGeoRasterLayer]"}, mapModel)
  }, [mapModel])

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
                   setPixiPointsLayer={setPixiPointsLayer}
                 />
               </DataConfigurationContext.Provider>
      }
      else if (isMapPolygonLayerModel(layerModel)) {
        return <MapPolygonLayer
          key ={`${kMapPolygonLayerType}-${index}`}
          mapLayerModel={layerModel}
        />
      }
      else if (isMapPinLayerModel(layerModel)) {
        return <MapPinLayer
          key={`${kMapPinLayerType}-${index}`}
          mapLayerModel={layerModel}
        />
      }
    })
  }

  return renderMapLayerComponents()
})
