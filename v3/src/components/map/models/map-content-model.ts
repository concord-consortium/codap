import {reaction} from "mobx"
import {addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import {ISharedModel} from "../../../models/shared/shared-model"
import {SharedModelChangeType} from "../../../models/shared/shared-model-manager"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import {IDataSet} from "../../../models/data/data-set"
import {ISharedDataSet, kSharedDataSetType, SharedDataSet} from "../../../models/shared/shared-data-set"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"
import {kMapModelName, kMapTileType} from "../map-defs"
import {datasetHasPointData, pointAttributesFromDataSet} from "../utilities/map-utils"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {MapPointLayerModel} from "./map-point-layer-model"

export interface MapProperties {
}

export const MapContentModel = DataDisplayContentModel
  .named(kMapModelName)
  .props({
    type: types.optional(types.literal(kMapTileType), kMapTileType),

    // center and zoom are kept in sync with Leaflet's map state
    center: types.optional(types.array(types.number), [0, 0]),
    zoom: 0,

    // This is the name of the layer used as an argument to L.esri.basemapLayer
    baseMapLayerName: "",

    // Changes the visibility of the layer in Leaflet with the opacity parameter
    baseMapLayerIsVisible: true,
  })
  .volatile(() => ({
    leafletMap: undefined as any,
  }))
  .actions(self => ({
    addPointLayer(dataSet: IDataSet) {
      const newPointLayer = MapPointLayerModel.create()
      self.layers.push(newPointLayer) // We have to do this first so safe references will work
      const dataConfiguration = newPointLayer.dataConfiguration,
        {latId, longId} = pointAttributesFromDataSet(dataSet)
      dataConfiguration.setDataset(dataSet, getSharedCaseMetadataFromDataset(dataSet))
      dataConfiguration.setAttribute('lat', {attributeID: latId})
      dataConfiguration.setAttribute('long', {attributeID: longId})
    },
    afterAttachToDocument() {
      // Monitor our parents and update our shared model when we have a document parent
      addDisposer(self, reaction(() => {
          const sharedModelManager = self.tileEnv?.sharedModelManager,
            sharedDataSets: ISharedDataSet[] = sharedModelManager?.isReady
              ? sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
              : []
          return {sharedModelManager, sharedDataSets}
        },
        // reaction/effect
        ({sharedModelManager, sharedDataSets}) => {
          if (!sharedModelManager?.isReady) {
            // We aren't added to a document yet, so we can't do anything yet
            return
          }
          const layersToCheck = self.layers.splice(0)
          sharedDataSets.forEach(sharedDataSet => {
            if (datasetHasPointData(sharedDataSet.dataSet)) {
              const layer = layersToCheck.find(aLayer => aLayer.data === sharedDataSet.dataSet)
              if (layer) {
                layersToCheck.splice(layersToCheck.indexOf(layer), 1)
              } else {
                // Add a new layer for this dataset
                this.addPointLayer(sharedDataSet.dataSet)
              }
            }
          })
          // Remove any layers that are no longer in the shared model
          layersToCheck.forEach(layer => {
            self.layers.splice(self.layers.indexOf(layer), 1)
          })
        },
        {name: "sharedModelSetup", fireImmediately: true}))
    },
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined, type: SharedModelChangeType) {
      /*
            if (type === "link") {
              self.dataConfiguration.setDataset(self.data, self.metadata)
            } else if (type === "unlink" && isSharedDataSet(sharedModel)) {
              self.dataConfiguration.setDataset(undefined, undefined)
            }
      */
    },
    setLeafletMap(leafletMap: any) {
      self.leafletMap = leafletMap
    }
  }))

export interface IMapContentModel extends Instance<typeof MapContentModel> {
}

export interface IMapModelContentSnapshot extends SnapshotIn<typeof MapContentModel> {
}

export function createMapContentModel(snap?: IMapModelContentSnapshot) {
  return MapContentModel.create()
}

export function isMapContentModel(model?: ITileContentModel): model is IMapContentModel {
  return model?.type === kMapTileType
}
