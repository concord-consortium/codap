import {observer} from "mobx-react-lite"
import React, {useEffect} from "react"
import { useMobXObservableValue } from "../../../hooks/use-mobx-observable-value"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { DataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"
import {PixiPoints} from "../../data-display/pixi/pixi-points"
import { LastRenderedMapLayerContext } from "../hooks/use-last-rendered-map-layer"
import {useMapModel} from "../hooks/use-map-model"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {kMapPinLayerType, kMapPointLayerType, kMapPolygonLayerType} from "../map-types"
import { isMapPinLayerModel } from "../models/map-pin-layer-model"
import {isMapPointLayerModel} from "../models/map-point-layer-model"
import {isMapPolygonLayerModel} from "../models/map-polygon-layer-model"
import { createOrUpdateLeafletGeoRasterLayer } from "../utilities/georaster-utils"
import { MapPinLayer } from "./map-pin-layer"
import {MapPointLayer} from "./map-point-layer"
import {MapPolygonLayer} from "./map-polygon-layer"

interface IProps {
  setPixiPointsLayer: (pixiPoints: PixiPoints, layerIndex: number) => void
}

export const MapInterior = observer(function MapInterior({setPixiPointsLayer}: IProps) {
  const mapModel = useMapModelContext()
  const [getLastRenderedMapLayer, setLastRenderedMapLayer] = useMobXObservableValue<"polygon" | "grid">()

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
        return (
          <DataConfigurationContext.Provider
            key={`${kMapPointLayerType}-${index}`}
            value={layerModel.dataConfiguration}
          >
            <MapPointLayer
              mapLayerModel={layerModel}
              setPixiPointsLayer={setPixiPointsLayer}
            />
          </DataConfigurationContext.Provider>
        )
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

  return (
    <LastRenderedMapLayerContext.Provider value={[getLastRenderedMapLayer, setLastRenderedMapLayer]}>
      {renderMapLayerComponents()}
    </LastRenderedMapLayerContext.Provider>
  )
})
