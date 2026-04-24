/**
 * MapPolygonLayerModel keeps track of the state of the map polygon layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {GeoJSON} from "leaflet"
import {ICollectionModel} from "../../../models/data/collection"
import {IDataSet} from "../../../models/data/data-set"
import {getMetadataFromDataSet} from "../../../models/shared/shared-data-utils"
import {IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {kMapPolygonLayerType} from "../map-types"
import {MapLayerModel} from "./map-layer-model"

export const MapPolygonLayerModel = MapLayerModel
  .named('MapPolygonLayerModel')
  .props({
    type: types.optional(types.literal(kMapPolygonLayerType), kMapPolygonLayerType),
  })
  .volatile(() => ({
    // Key is case ID
    // assertion is load-bearing: MST otherwise infers {} which can't be indexed by string
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    features: {} as Record<string, GeoJSON>
  }))
  .actions(self => ({
    afterCreate() {
      // Set pointSizeMultiplier to -1 so that DisplayItemFormatControlPanel knows it's a polygon
      self.displayItemDescription.setPointSizeMultiplier(-1)
    },
    setBoundaryAttribute(dataSet: IDataSet, boundaryAttrId: string) {
      self.dataConfiguration.setDataset(dataSet, getMetadataFromDataSet(dataSet))
      self.dataConfiguration.setAttribute('polygon', {attributeID: boundaryAttrId})
    }

  }))
  .views(self => ({
    get boundaryAttributeId() {
      return self.dataConfiguration.attributeID('polygon')
    },
    get polygonDescription() {
      return self.displayItemDescription
    },
    get titleCollection(): Maybe<ICollectionModel> {
      const polygonId = self.dataConfiguration.attributeID('polygon')
      return polygonId ? self.dataConfiguration.dataset?.getCollectionForAttribute(polygonId) : undefined
    }
  }))

export interface IMapPolygonLayerModel extends Instance<typeof MapPolygonLayerModel> {
}

export interface IMapPolygonLayerModelSnapshot extends SnapshotIn<typeof MapPolygonLayerModel> {
}

export function isMapPolygonLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapPolygonLayerModel {
  return layerModel?.type === kMapPolygonLayerType
}
