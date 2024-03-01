/**
 * MapPointLayerModel keeps track of the state of the map points layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {kMapPointLayerType} from "../map-types"
import {MapLayerModel} from "./map-layer-model"
import {IDataSet} from "../../../models/data/data-set"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"
import {computePointRadius} from "../../data-display/data-display-utils"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"

export const MapPointLayerModel = MapLayerModel
  .named('MapPointLayerModel')
  .props({
    type: types.optional(types.literal(kMapPointLayerType), kMapPointLayerType),
  })
  .actions(self => ({
    setDataset(dataSet:IDataSet) {
      const {latId, longId} = latLongAttributesFromDataSet(dataSet)
      self.dataConfiguration.setDataset(dataSet, getSharedCaseMetadataFromDataset(dataSet))
      self.dataConfiguration.setAttribute('lat', {attributeID: latId})
      self.dataConfiguration.setAttribute('long', {attributeID: longId})
    }

  }))
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.caseDataArray.length,
        self.displayItemDescription.pointSizeMultiplier, use)
    },
    get pointDescription() {
      return self.displayItemDescription
    }
  }))


export interface IMapPointLayerModel extends Instance<typeof MapPointLayerModel> {
}

export interface IMapPointLayerModelSnapshot extends SnapshotIn<typeof MapPointLayerModel> {
}

export function isMapPointLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapPointLayerModel {
  return layerModel?.type === kMapPointLayerType
}

