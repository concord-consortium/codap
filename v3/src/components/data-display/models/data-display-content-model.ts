/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {comparer, reaction} from "mobx"
import {addDisposer, Instance, types} from "mobx-state-tree"
import {TileContentModel} from "../../../models/tiles/tile-content"
import {IDataSet} from "../../../models/data/data-set"
import {ISharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {ISharedDataSet} from "../../../models/shared/shared-data-set"
import {
  getAllTileCaseMetadata, getAllTileDataSets, getSharedDataSetFromDataSetId
} from "../../../models/shared/shared-data-utils"
import {DataDisplayLayerModelUnion} from "./data-display-layer-union"
import {DisplayItemDescriptionModel} from "./display-item-description-model"
import {GraphPlace} from "../../axis-graph-shared"

export const DataDisplayContentModel = TileContentModel
  .named("DataDisplayContentModel")
  .props({
    layers: types.array(DataDisplayLayerModelUnion),
    pointDescription: types.optional(DisplayItemDescriptionModel, () => DisplayItemDescriptionModel.create()),
  })
  .volatile(() => ({
    animationEnabled: false,
  }))
  .views(() => ({
    placeCanAcceptAttributeIDDrop(place: GraphPlace,
                             dataset: IDataSet | undefined,
                             attributeID: string | undefined): boolean {
      return false
    }
  }))
  .actions(self => ({
    startAnimation() {
      self.animationEnabled = true
      setTimeout(() => this.stopAnimation(), 2000)
    },
    stopAnimation() {
      self.animationEnabled = false
    },
    installSharedModelManagerSync() {
      // synchronizes shared model references from layers' DataConfigurations to the sharedModelManager
      addDisposer(self, reaction(
        () => {
          const layerDataSetIds = new Set<string>()
          const layerMetadataIds = new Set<string>()
          self.layers.forEach((layer, i) => {
            const sharedDataSet = getSharedDataSetFromDataSetId(self, layer.data?.id ?? "")
            if (sharedDataSet) layerDataSetIds.add(sharedDataSet.id)
            if (layer.metadata) layerMetadataIds.add(layer.metadata.id)
          })
          return { layerDataSetIds, layerMetadataIds }
        },
        ({ layerDataSetIds, layerMetadataIds }) => {
          const sharedModelManager = self.tileEnv?.sharedModelManager
          if (sharedModelManager) {
            // remove links to unconnected shared data sets
            getAllTileDataSets(self).forEach(sharedDataSet => {
              if (!layerDataSetIds.has(sharedDataSet.id)) {
                sharedModelManager.removeTileSharedModel(self, sharedDataSet)
              }
            })
            // add links to connected shared data sets
            layerDataSetIds.forEach(id => {
              const sharedDataSet = sharedModelManager.getSharedModelById<ISharedDataSet>(id)
              sharedDataSet && sharedModelManager.addTileSharedModel(self, sharedDataSet)
            })
            // remove links to unconnected shared case metadata
            getAllTileCaseMetadata(self).forEach(sharedMetadata => {
              if (!layerMetadataIds.has(sharedMetadata.id)) {
                sharedModelManager.removeTileSharedModel(self, sharedMetadata)
              }
            })
            // add links to connected shared metadata
            layerMetadataIds.forEach(id => {
              const sharedMetadata = sharedModelManager.getSharedModelById<ISharedCaseMetadata>(id)
              sharedMetadata && sharedModelManager.addTileSharedModel(self, sharedMetadata)
            })
          }
        }, {
          name: "DataDisplayContentModel.sharedModelManagerListener",
          equals: comparer.structural,
          fireImmediately: true
        }
      ))
    }
  }))
export interface IDataDisplayContentModel extends Instance<typeof DataDisplayContentModel> {}
