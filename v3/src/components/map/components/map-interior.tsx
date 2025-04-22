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
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { isMapPinLayerModel } from "../models/map-pin-layer-model"
import { MapPinLayer } from "./map-pin-layer"
import { createLeafletGeoRasterLayer } from "../utilities/georaster-utils"

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

  // Add GeoRaster layer when URL changes
  // FIXME: using an effect here is not ideal. It requires two renders to add the layer.
  // A mobx reaction would be better. This could be in the map model, or perhaps in a
  // presentation model that is used by this component.
  useEffect(function addGeoTIFFLayer() {
    if (!mapModel.geoRaster) return

    // Add the GeoRaster using the georaster-layer-for-leaflet library
    createLeafletGeoRasterLayer(mapModel).then(result => {
      if (!result) return
      const { georaster, layer } = result
      if (georaster && layer && mapModel.leafletMap) {
        mapModel.leafletMap.eachLayer((existingLayer) => {
          // We need to remove the existing layer if it is a georaster layer
          // This is a bit of a hack. It isn't clear how to tell the type of a layer.
          if ("georasters" in existingLayer) {
            // FIXME: This still causes a flicker where the is no layer for a moment.
            // Probably this can be fixed by updating the existing layer instead of
            // removing it and adding it again. That can probably be done by
            // calling layer.updateColors(...)
            existingLayer.remove()
          }
        })
        layer.addTo(mapModel.leafletMap)
      }
    })
  }, [mapModel, mapModel.geoRaster?.url, mapModel.leafletMap])


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
