/**
 * MapPointLayerModel keeps track of the state of the map points layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {IMapLayerModel, MapLayerModel} from "./map-layer-model"
import {IDataSet} from "../../../models/data/data-set"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"
import {DataConfigurationModel} from "../../data-display/models/data-configuration-model"
import {PointDescriptionModel} from "../../data-display/models/point-description-model"
import {defaultPointColor} from "../../../utilities/color-utils"
import {computePointRadius} from "../../data-display/data-display-utils"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"

export const kMapPointLayerType = "mapPointLayer"

export const MapPointLayerModel = MapLayerModel
  .named('MapPointLayerModel')
  .props({
    type: types.optional(types.literal(kMapPointLayerType), kMapPointLayerType),
    dataConfiguration: types.optional(DataConfigurationModel, () => DataConfigurationModel.create()),
    pointDescription: types.optional(PointDescriptionModel, () => PointDescriptionModel.create()),
  })
  .actions(self => ({
    afterCreate() {
      self.pointDescription.setPointColor(self.layerIndex === 0
        ? defaultPointColor : self.pointDescription.pointColorAtIndex(self.layerIndex))
    },
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
        self.pointDescription.pointSizeMultiplier, use)
    },
  }))


export interface IMapPointLayerModel extends Instance<typeof MapPointLayerModel> {
}

export interface IMapPointLayerModelSnapshot extends SnapshotIn<typeof MapPointLayerModel> {
}

export function isMapPointLayerModel(layerModel?: IMapLayerModel): layerModel is IMapPointLayerModel {
  return layerModel?.type === kMapPointLayerType
}

