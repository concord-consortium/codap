import {comparer, reaction} from "mobx"
import {addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import {ICollectionModel} from "../../../models/data/collection"
import {isCaseValueChangeAction} from "../../../models/data/data-set-actions"
import {onAnyAction} from "../../../utilities/mst-utils"
import {IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {kMapPointLayerType} from "../map-types"
import {MapLayerModel} from "./map-layer-model"
import {IDataSet} from "../../../models/data/data-set"
import {getMetadataFromDataSet} from "../../../models/shared/shared-data-utils"
import {computePointRadius} from "../../data-display/data-display-utils"
import {getCaseLatLong} from "../utilities/map-utils"
import {MapGridModel} from "./map-grid-model"
import {MapHotSpotModel} from "./map-hot-spot-model"

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
    hotSpotModel: types.optional(MapHotSpotModel, () => MapHotSpotModel.create()),
    pointsAreVisible: true, // This is different than layer visibility
    connectingLinesAreVisible: false,
    displayType: types.optional(types.enumeration([...MapPointDisplayTypes]), "points"),
  })
  .volatile(() => ({
    // Bumped when the set of plotted cases changes (cases added, removed, hidden, filtered, set aside)
    pointCasesVersion: 0,
    // Bumped when plotted coordinate values may have changed (value edits, cases added or removed,
    // lat/long attribute type changes)
    pointValuesVersion: 0,
    // Whether the latest pointValuesVersion bump came from a value change made while the dataset was
    // caching, in which case only selected cases changed
    pointValuesChangedWhileCaching: false
  }))
  .views(self => ({
    // Changes whenever either version changes, for consumers that don't care which kind of change happened
    get pointDataVersion() {
      return self.pointCasesVersion + self.pointValuesVersion
    }
  }))
  .actions(self => ({
    bumpPointCasesVersion() {
      self.pointCasesVersion++
    },
    bumpPointValuesVersion(whileCaching = false) {
      self.pointValuesChangedWhileCaching = whileCaching
      self.pointValuesVersion++
    }
  }))
  .actions(self => ({
    afterCreate() {
      self.gridModel.setDataConfiguration(self.dataConfiguration)
      self.gridModel.setPointDataSource(self)
      const { dataConfiguration } = self

      // The set of plotted cases changed (added, removed, hidden, filtered, set aside)
      addDisposer(self, reaction(
        () => dataConfiguration.caseDataHash,
        () => self.bumpPointCasesVersion(),
        { name: "MapPointLayerModel.pointCasesVersion" }
      ))

      // Changing a lat/long attribute's type changes its numeric values and which cases are valid
      addDisposer(self, reaction(
        () => [dataConfiguration.attributeType("lat"), dataConfiguration.attributeType("long")],
        () => {
          dataConfiguration.invalidateCases()
          self.bumpPointValuesVersion()
        },
        { name: "MapPointLayerModel.latLongTypeChange", equals: comparer.structural }
      ))

      // Value changes and case additions/removals in whichever dataset the layer is showing
      let disposeActionListener: Maybe<() => void>
      addDisposer(self, reaction(
        () => dataConfiguration.dataset,
        dataset => {
          disposeActionListener?.()
          disposeActionListener = dataset && onAnyAction(dataset, action => {
            if (isCaseValueChangeAction(action)) {
              self.bumpPointValuesVersion(dataset.isCaching())
            } else if (["addCases", "removeCases"].includes(action.name)) {
              self.bumpPointValuesVersion()
            }
          })
        },
        { name: "MapPointLayerModel.datasetActions", fireImmediately: true }
      ))
      addDisposer(self, () => disposeActionListener?.())
    },
    setPointAttributes(dataSet: IDataSet, latAttrId: string, longAttrId: string) {
      self.dataConfiguration.setDataset(dataSet, getMetadataFromDataSet(dataSet))
      self.dataConfiguration.setAttribute('lat', {attributeID: latAttrId})
      self.dataConfiguration.setAttribute('long', {attributeID: longAttrId})
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
    get pointAttributes() {
      const latId = self.dataConfiguration.attributeID('lat')
      const longId = self.dataConfiguration.attributeID('long')
      return latId && longId ? { latId, longId } : undefined
    },
    getCaseLatLong(caseID: string) {
      const { dataset } = self.dataConfiguration
      const attrs = this.pointAttributes
      return dataset && attrs ? getCaseLatLong(dataset, caseID, attrs.latId, attrs.longId) : undefined
    },
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.getCaseDataArray(0).length,
        self.displayItemDescription.pointSizeMultiplier, use)
    },
    get pointDescription() {
      return self.displayItemDescription
    },
    get titleCollection(): Maybe<ICollectionModel> {
      const latId = self.dataConfiguration.attributeID('lat')
      return latId ? self.dataConfiguration.dataset?.getCollectionForAttribute(latId) : undefined
    }
  }))


export interface IMapPointLayerModel extends Instance<typeof MapPointLayerModel> {
}

export interface IMapPointLayerModelSnapshot extends SnapshotIn<typeof MapPointLayerModel> {
}

export function isMapPointLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapPointLayerModel {
  return layerModel?.type === kMapPointLayerType
}
