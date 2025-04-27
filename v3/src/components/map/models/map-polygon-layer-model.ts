/**
 * MapPolygonLayerModel keeps track of the state of the map polygon layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {GeoJSON} from "leaflet"
import {IDataSet} from "../../../models/data/data-set"
import {getMetadataFromDataSet} from "../../../models/shared/shared-data-utils"
import {IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {kMapPolygonLayerType} from "../map-types"
import {boundaryAttributeFromDataSet} from "../utilities/map-utils"
import {MapLayerModel} from "./map-layer-model"

export const MapPolygonLayerModel = MapLayerModel
  .named('MapPolygonLayerModel')
  .props({
    type: types.optional(types.literal(kMapPolygonLayerType), kMapPolygonLayerType),
  })
  .volatile(() => ({
    // Key is case ID
    features: {} as Record<string, GeoJSON>
  }))
  .actions(self => ({
    afterCreate() {
      // Set pointSizeMultiplier to -1 so that DisplayItemFormatControlPanel knows it's a polygon
      self.displayItemDescription.setPointSizeMultiplier(-1)
    },
    setDataset(dataSet: IDataSet) {
      const boundaryId = boundaryAttributeFromDataSet(dataSet)
      self.dataConfiguration.setDataset(dataSet, getMetadataFromDataSet(dataSet))
      self.dataConfiguration.setAttribute('polygon', {attributeID: boundaryId})
    }

  }))
  .views(self => ({
    get polygonDescription() {
      return self.displayItemDescription
    }
  }))

export interface IMapPolygonLayerModel extends Instance<typeof MapPolygonLayerModel> {
}

export interface IMapPolygonLayerModelSnapshot extends SnapshotIn<typeof MapPolygonLayerModel> {
}

export function isMapPolygonLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapPolygonLayerModel {
  return layerModel?.type === kMapPolygonLayerType
}
