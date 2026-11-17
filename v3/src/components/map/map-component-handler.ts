import { getSnapshot } from "mobx-state-tree"
import { SetRequired } from "type-fest"
import { V2Map } from "../../data-interactive/data-interactive-component-types"
import { DIValues } from "../../data-interactive/data-interactive-types"
import { DIComponentHandler } from "../../data-interactive/handlers/component-handler"
import {
  namedAttributeNotFoundResult, namedDataContextNotFoundResult
} from "../../data-interactive/handlers/di-results"
import { appState } from "../../models/app-state"
import { getMetadataFromDataSet, getSharedDataSets } from "../../models/shared/shared-data-utils"
import { ITileContentModel } from "../../models/tiles/tile-content"
import {
  AttributeDescriptionsMapSnapshot, kDataConfigurationType
} from "../data-display/models/data-configuration-model"
import { kMapTileType } from "./map-defs"
import { kMapPinLayerType, kMapPointLayerType, kMapPolygonLayerType, MapLayerType } from "./map-types"
import { IMapBaseLayerModelSnapshot } from "./models/map-base-layer-model"
import {
  GeoRasterModel, IMapContentModel, IMapModelContentSnapshot, isMapContentModel
} from "./models/map-content-model"
import { IMapPinLayerModelSnapshot } from "./models/map-pin-layer-model"
import { IMapPointLayerModelSnapshot } from "./models/map-point-layer-model"
import { IMapPolygonLayerModelSnapshot } from "./models/map-polygon-layer-model"
import { DataSetMapAttributes } from "./utilities/data-set-map-attributes"

type IMapLayerModelSnapshot =
  IMapBaseLayerModelSnapshot |
  IMapPolygonLayerModelSnapshot |
  IMapPointLayerModelSnapshot |
  IMapPinLayerModelSnapshot

// The data sets a map's layers show. A map keeps its data configurations in its layers.
function mapLayerDataSets(content: IMapContentModel) {
  return Array.from(new Set(content.layers.map(layer => layer.data).filter(dataSet => !!dataSet)))
}

// A legend attribute that none of the data sets a map shows has is refused (CODAP-1711). A map with no data
// ignores it.
function isLegendAttributeNotFound(content: IMapContentModel, legendAttributeName: string) {
  const dataSets = mapLayerDataSets(content)
  return dataSets.length > 0 && !dataSets.some(dataSet => dataSet.getAttributeByName(legendAttributeName))
}

export const mapComponentHandler: DIComponentHandler = {
  create({ values }) {
    const { document } = appState
    const { center: _center, dataContext: _dataContext, legendAttributeName, zoom } = values as V2Map
    const dataContext = _dataContext
      ? getSharedDataSets(document).find(sd => sd.dataSet.matchTitleOrNameOrId(_dataContext))?.dataSet
      : undefined
    // A data context, or a legend attribute in it, that is named but not found is refused, which V2 did
    // not do. As in V2, a legend attribute is looked for only in a named data context.
    if (_dataContext && !dataContext) {
      return namedDataContextNotFoundResult(_dataContext)
    }
    const legendAttributeId = legendAttributeName
      ? dataContext?.getAttributeByName(legendAttributeName)?.id : undefined
    if (dataContext && legendAttributeName && !legendAttributeId) {
      return namedAttributeNotFoundResult(legendAttributeName)
    }
    const layers: Array<IMapLayerModelSnapshot> = []
    let layerIndex = 0
    getSharedDataSets(document).forEach(sharedDataSet => {
      const dataset = sharedDataSet.dataSet
      const metadata = getMetadataFromDataSet(dataset)
      if (metadata) {
        const addLayer = (_type: MapLayerType, _attributeDescriptions: AttributeDescriptionsMapSnapshot) => {
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

        const dsMapAttrs = new DataSetMapAttributes(dataset)
        dsMapAttrs.collections.forEach(mapAttrs => {
          // points
          if (mapAttrs.points?.latAttrId && mapAttrs.points?.longAttrId) {
            const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
              lat: { attributeID: mapAttrs.points.latAttrId },
              long: { attributeID: mapAttrs.points.longAttrId }
            }
            if (dataset.id === dataContext?.id && legendAttributeId) {
              _attributeDescriptions.legend = { attributeID: legendAttributeId }
            }
            addLayer(kMapPointLayerType, _attributeDescriptions)
          }
          // boundaries
          if (mapAttrs.boundaries) {
            addLayer(kMapPolygonLayerType, {
              polygon: { attributeID: mapAttrs.boundaries.attrId }
            })
          }
          // pins
          if (mapAttrs.pins?.latAttrId && mapAttrs.pins?.longAttrId) {
            const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
              lat: { attributeID: mapAttrs.pins.latAttrId },
              long: { attributeID: mapAttrs.pins.longAttrId }
            }
            if (dataset.id === dataContext?.id && legendAttributeId) {
              _attributeDescriptions.legend = { attributeID: legendAttributeId }
            }
            addLayer(kMapPinLayerType, _attributeDescriptions)
          }
        })
      }
    })

    const center = _center ? { lat: _center[0], lng: _center[1] } : undefined
    const content: SetRequired<IMapModelContentSnapshot, "type"> = {
      type: kMapTileType,
      center,
      layers,
      zoom
    }
    return { content }
  },

  get(content) {
    if (isMapContentModel(content)) {
      return { dataContext: content.dataConfiguration?.dataset?.name }
    }
  },

  validateUpdate(content: ITileContentModel, values: DIValues) {
    if (!isMapContentModel(content)) return
    const { legendAttributeName } = values as V2Map
    if (legendAttributeName && isLegendAttributeNotFound(content, legendAttributeName)) {
      return namedAttributeNotFoundResult(legendAttributeName)
    }
  },

  update(content: ITileContentModel, values: DIValues) {
    if (!isMapContentModel(content)) return { success: false }

    const { legendAttributeName, center: _center, zoom: _zoom, geoRaster } = values as V2Map
    if (legendAttributeName) {
      if (isLegendAttributeNotFound(content, legendAttributeName)) {
        return namedAttributeNotFoundResult(legendAttributeName)
      }
      // As from the legend's menu, each data set the map shows that has the attribute gives it to one of its layers
      mapLayerDataSets(content).forEach(dataSet => {
        const legendAttribute = dataSet.getAttributeByName(legendAttributeName)
        if (legendAttribute) content.setLegendAttribute(dataSet.id, legendAttribute.id, legendAttribute.type)
      })
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
