import {observer} from "mobx-react-lite"
import React, {useEffect} from "react"
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
import { createGeoTIFFLayer } from "../utilities/geotiff-utils"

interface IProps {
  setPixiPointsLayer: (pixiPoints: PixiPoints, layerIndex: number) => void
}

export const MapInterior = observer(function MapInterior({setPixiPointsLayer}: IProps) {
  const mapModel = useMapModelContext()
  const { transitionComplete: tileTransitionComplete } = useTileModelContext()

  useMapModel()

  // Ensure the map rescales when its tile's CSS transition is complete to compensate for any changes to the tile's
  // size that may have occurred after the map was initially rendered.
  useEffect(function rescaleOnTileTransitionEnd() {
    if (tileTransitionComplete) {
      mapModel.rescale()
    }
  }, [tileTransitionComplete, mapModel])

  // Add GeoTIFF layer when URL changes
  useEffect(function addGeoTIFFLayer() {
    if (!mapModel.geotiffUrl) return

    // Remove existing GeoTIFF layer
    mapModel.setGeoraster()
    if (mapModel.geotiffLayer) {
      mapModel.geotiffLayer.remove()
      mapModel.setGeotiffLayer()
    }

    // Add new GeoTIFF layer if possible
    createGeoTIFFLayer(mapModel.geotiffUrl).then(result => {
      if (!result) return
      const { georaster, layer } = result
      if (georaster && layer && mapModel.leafletMap) {
        layer.addTo(mapModel.leafletMap)
        mapModel.setGeotiffLayer(layer)
        mapModel.setGeoraster(georaster)
      }
    })
  }, [mapModel.geotiffUrl, mapModel.leafletMap])

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
    })
  }

  return (
    <>
      {renderMapLayerComponents()}
    </>
  )
})
