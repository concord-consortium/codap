import { SetRequired } from "type-fest"
import { getSnapshot } from "mobx-state-tree"
import { V2Map } from "../../data-interactive/data-interactive-component-types"
import { DIValues } from "../../data-interactive/data-interactive-types"
import { DIComponentHandler } from "../../data-interactive/handlers/component-handler"
import { appState } from "../../models/app-state"
import {
  getDataSetByNameOrId, getMetadataFromDataSet, getSharedDataSets
} from "../../models/shared/shared-data-utils"
import { ITileContentModel } from "../../models/tiles/tile-content"
import {
  AttributeDescriptionsMapSnapshot, kDataConfigurationType
} from "../data-display/models/data-configuration-model"
import { kMapTileType } from "./map-defs"
import { kMapPointLayerType, kMapPolygonLayerType } from "./map-types"
import { IMapBaseLayerModelSnapshot } from "./models/map-base-layer-model"
import { GeoRasterModel, IMapModelContentSnapshot, isMapContentModel } from "./models/map-content-model"
import { IMapPointLayerModelSnapshot } from "./models/map-point-layer-model"
import { IMapPolygonLayerModelSnapshot } from "./models/map-polygon-layer-model"
import {
  boundaryAttributeFromDataSet, datasetHasBoundaryData, datasetHasLatLongData, latLongAttributesFromDataSet
} from "./utilities/map-utils"

export const mapComponentHandler: DIComponentHandler = {
  create({ values }) {
    const { document } = appState
    const { center: _center, dataContext: _dataContext, legendAttributeName, zoom } = values as V2Map
    const dataContext = getDataSetByNameOrId(document, _dataContext)
    const legendAttributeId = legendAttributeName
      ? dataContext?.getAttributeByName(legendAttributeName)?.id : undefined
    const layers:
      Array<IMapBaseLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot> = []
    let layerIndex = 0
    getSharedDataSets(document).forEach(sharedDataSet => {
      const dataset = sharedDataSet.dataSet
      const metadata = getMetadataFromDataSet(dataset)
      if (metadata) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const LayerTypes = [kMapPointLayerType, kMapPolygonLayerType] as const
        type LayerType = typeof LayerTypes[number]
        const addLayer = (_type: LayerType, _attributeDescriptions: AttributeDescriptionsMapSnapshot) => {
          layers.push({
            dataConfiguration: {
              _attributeDescriptions,
              dataset: dataset.id,
              metadata: metadata.id,
              type: kDataConfigurationType
            },
            layerIndex: layerIndex++,
            type: _type
          })
        }

        // Point Layer
        if (datasetHasLatLongData(dataset)) {
          const { latId, longId } = latLongAttributesFromDataSet(dataset)
          const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
            lat: { attributeID: latId },
            long: { attributeID: longId }
          }
          if (dataset.id === dataContext?.id && legendAttributeId) {
            _attributeDescriptions.legend = { attributeID: legendAttributeId }
          }
          addLayer(kMapPointLayerType, _attributeDescriptions)

        // Polygon Layer
        } else if (datasetHasBoundaryData(dataset)) {
          const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
            polygon: { attributeID: boundaryAttributeFromDataSet(dataset) }
          }
          addLayer(kMapPolygonLayerType, _attributeDescriptions)
        }
      }
    })

    const center = _center ? { lat: _center[0], lng: _center[1] } : undefined
    const content: SetRequired<IMapModelContentSnapshot, "type"> = {
      type: kMapTileType,
      center,
      layers,
      zoom
    }
    // If the center or zoom are specified, we need to prevent CODAP from automatically focusing the map
    const options = center || zoom != null ? { transitionComplete: true } : undefined

    return { content, options }
  },

  get(content) {
    if (isMapContentModel(content)) {
      return { dataContext: content.dataConfiguration?.dataset?.name }
    }
  },

  update(content: ITileContentModel, values: DIValues) {
    if (!isMapContentModel(content)) return { success: false }

    // TODO: Finish implementing this function. See the Codap API docs for all properties that should be handled.
    const { legendAttributeName, center: _center, zoom: _zoom, geoRaster } = values as V2Map
    const { dataConfiguration } = content
    const dataset = dataConfiguration?.dataset
    if (dataset && legendAttributeName != null) {
      const legendAttribute = dataset.getAttributeByName(legendAttributeName)
      if (legendAttribute && dataConfiguration.placeCanAcceptAttributeIDDrop("legend", dataset, legendAttribute.id)) {
        dataConfiguration.setAttribute("legend", { attributeID: legendAttribute.id })
      }
    }
    if (_center != null || _zoom != null) {
      const center = _center ? { lat: _center[0], lng: _center[1] } : content.center
      const zoom = _zoom ?? content.zoom
      content.setCenterAndZoom(center, zoom)
    }

    if (geoRaster !== undefined) {
      // If the geoRaster is undefined that means the user didn't want to change it
      // If the geoRaster is otherwise falsy (null, false, "", or 0) we remove it
      if (!geoRaster) {
        content.setGeoRaster(undefined)
      } else {
        const existingGeoRasterSnapshot = content.geoRaster ? getSnapshot(content.geoRaster) : {}
        const newGeoRasterSnapshot = { ...existingGeoRasterSnapshot, ...geoRaster }
        const geoRasterModel = GeoRasterModel.create(newGeoRasterSnapshot)
        content.setGeoRaster(geoRasterModel)
      }
    }

    return { success: true }
  }
}
