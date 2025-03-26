import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {kMapPointLayerType} from "../map-types"
import {MapLayerModel} from "./map-layer-model"
import {IDataSet} from "../../../models/data/data-set"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"
import {computePointRadius} from "../../data-display/data-display-utils"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"
import {MapGridModel} from "./map-grid-model"

export const MapPointDisplayTypes = ["points", "heatmap"] as const
export type MapPointDisplayType = typeof MapPointDisplayTypes[number]
export function isMapPointDisplayType(value: any): value is MapPointDisplayType {
  return MapPointDisplayTypes.includes(value)
}

export const MapPointLayerModel = MapLayerModel
  .named('MapPointLayerModel')
  .props({
    type: types.optional(types.literal(kMapPointLayerType), kMapPointLayerType),
    gridModel: types.optional(MapGridModel, () => MapGridModel.create()),
    pointsAreVisible: true, // This is different than layer visibility
    connectingLinesAreVisible: false,
    displayType: types.optional(types.enumeration([...MapPointDisplayTypes]), "points"),
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
    setPointsAreVisible(isVisible: boolean) {
      self.pointsAreVisible = isVisible
    },
    setConnectingLinesAreVisible(isVisible: boolean) {
      self.connectingLinesAreVisible = isVisible
    },
    setDisplayType(displayType: MapPointDisplayType) {
      self.displayType = displayType
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


export interface IMapPointLayerModel extends Instance<typeof MapPointLayerModel> {
}

export interface IMapPointLayerModelSnapshot extends SnapshotIn<typeof MapPointLayerModel> {
}

export function isMapPointLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapPointLayerModel {
  return layerModel?.type === kMapPointLayerType
}
