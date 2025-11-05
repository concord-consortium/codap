import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { IDataSet } from "../../../models/data/data-set"
import { getMetadataFromDataSet } from "../../../models/shared/shared-data-utils"
import { computePointRadius } from "../../data-display/data-display-utils"
import { IDataDisplayLayerModel } from "../../data-display/models/data-display-layer-model"
import { kMapPinLayerType } from "../map-types"
import { MapGridModel } from "./map-grid-model"
import { MapLayerModel } from "./map-layer-model"

export const MapPinLayerModel = MapLayerModel
  .named('MapPinLayerModel')
  .props({
    type: types.optional(types.literal(kMapPinLayerType), kMapPinLayerType),
    gridModel: types.optional(MapGridModel, () => MapGridModel.create()),
    pinsAreVisible: true, // This is different than layer visibility
  })
  .volatile(self => ({
    addMode: false
  }))
  .actions(self => ({
    afterCreate() {
      self.gridModel.setDataConfiguration(self.dataConfiguration)
    },
    setPinAttributes(dataSet: IDataSet, pinLatId: string, pinLongId: string) {
      self.dataConfiguration.setDataset(dataSet, getMetadataFromDataSet(dataSet))
      self.dataConfiguration.setAttribute('pinLat', { attributeID: pinLatId })
      self.dataConfiguration.setAttribute('pinLong', { attributeID: pinLongId })
    },
    setPinsAreVisible(isVisible: boolean) {
      self.pinsAreVisible = isVisible
    },
    setAddMode(addMode: boolean) {
      self.addMode = addMode
    }
  }))
  .views(self => ({
    get pinAttributes() {
      const latId = self.dataConfiguration.attributeID('pinLat')
      const longId = self.dataConfiguration.attributeID('pinLong')
      return latId && longId ? { latId, longId } : undefined
    },
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
