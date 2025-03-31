import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {IDataSet} from "../../../models/data/data-set"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"
import {computePointRadius} from "../../data-display/data-display-utils"
import {IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {kMapPinLayerType} from "../map-types"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"
import {MapGridModel} from "./map-grid-model"
import {MapLayerModel} from "./map-layer-model"

export const MapPointDisplayTypes = ["points", "heatmap"] as const
export type MapPointDisplayType = typeof MapPointDisplayTypes[number]
export function isMapPointDisplayType(value: any): value is MapPointDisplayType {
  return MapPointDisplayTypes.includes(value)
}

export const MapPinLayerModel = MapLayerModel
  .named('MapPinLayerModel')
  .props({
    type: types.optional(types.literal(kMapPinLayerType), kMapPinLayerType),
    gridModel: types.optional(MapGridModel, () => MapGridModel.create()),
    pinsAreVisible: true, // This is different than layer visibility
  })
  .actions(self => ({
    afterCreate() {
      self.gridModel.setDataConfiguration(self.dataConfiguration)
    },
    setDataset(dataSet:IDataSet) {
      const {latId, longId} = latLongAttributesFromDataSet(dataSet)
      self.dataConfiguration.setDataset(dataSet, getSharedCaseMetadataFromDataset(dataSet))
      self.dataConfiguration.setAttribute('lat', {attributeID: latId})
      self.dataConfiguration.setAttribute('long', {attributeID: longId})
    },
    setPinsAreVisible(isVisible: boolean) {
      self.pinsAreVisible = isVisible
    }
  }))
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.getCaseDataArray(0).length,
        self.displayItemDescription.pointSizeMultiplier, use)
    },
    get pointDescription() {
      return self.displayItemDescription
    }
  }))


export interface IMapPinLayerModel extends Instance<typeof MapPinLayerModel> {
}

export interface IMapPinLayerModelSnapshot extends SnapshotIn<typeof MapPinLayerModel> {
}

export function isMapPinLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapPinLayerModel {
  return layerModel?.type === kMapPinLayerType
}
