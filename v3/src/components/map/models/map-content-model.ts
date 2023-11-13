import {reaction} from "mobx"
import {addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import {ISharedModel} from "../../../models/shared/shared-model"
import {SharedModelChangeType} from "../../../models/shared/shared-model-manager"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import {applyUndoableAction} from "../../../models/history/apply-undoable-action"
import {IDataSet} from "../../../models/data/data-set"
import {ISharedDataSet, kSharedDataSetType, SharedDataSet} from "../../../models/shared/shared-data-set"
import {kMapModelName, kMapTileType} from "../map-defs"
import {datasetHasLatLongData, latLongAttributesFromDataSet} from "../utilities/map-utils"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {MapPointLayerModel} from "./map-point-layer-model"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"

export interface MapProperties {
}

export const MapContentModel = DataDisplayContentModel
  .named(kMapModelName)
  .props({
    type: types.optional(types.literal(kMapTileType), kMapTileType),

    // center and zoom are kept in sync with Leaflet's map state
    center: types.optional(types.map(types.number), {lat: 0, lng: 0}),
    zoom: -1, // -1 means no zoom has yet been set

    // This is the name of the layer used as an argument to L.esri.basemapLayer
    baseMapLayerName: "",

    // Changes the visibility of the layer in Leaflet with the opacity parameter
    baseMapLayerIsVisible: true,
  })
  .volatile(() => ({
    leafletMap: undefined as any,
    displayChangeCount: 0,
    hasBeenInitialized: false
  }))
  .actions(self => ({
    syncCenterAndZoom() {
      const center = self.leafletMap.getCenter()
      self.center.replace({lat: center.lat, lng: center.lng})
      self.zoom = self.leafletMap.getZoom()
    },
    addPointLayer(dataSet: IDataSet) {
      const newPointLayer = MapPointLayerModel.create()
      self.layers.push(newPointLayer) // We have to do this first so safe references will work
      const dataConfiguration = newPointLayer.dataConfiguration,
        {latId, longId} = latLongAttributesFromDataSet(dataSet)
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
          // We make a copy of the layers array and remove any layers that are still in the shared model
          // If there are any layers left in the copy, they are no longer in any shared  dataset and should be removed
          const layersToCheck = Array.from(self.layers)
          sharedDataSets.forEach(sharedDataSet => {
            if (datasetHasLatLongData(sharedDataSet.dataSet)) {
              const foundIndex = layersToCheck.findIndex(aLayer => aLayer.data === sharedDataSet.dataSet)
              if (foundIndex >= 0) {
                const layer = layersToCheck[foundIndex],
                  dataset = sharedDataSet.dataSet
                layer.dataConfiguration.setDataset(dataset, getSharedCaseMetadataFromDataset(dataset))
                // Remove this layer from the list of layers to check since it _is_ present
                layersToCheck.splice(foundIndex, 1)
              } else {
                // Add a new layer for this dataset
                this.addPointLayer(sharedDataSet.dataSet)
              }
            }
          })
          // Remove any remaining layers in layersToCheck since they are no longer in any shared dataset
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
    },
    setHasBeenInitialized() {
      self.hasBeenInitialized = true
    },
    incrementDisplayChangeCount() {
      self.displayChangeCount++
    },
    rescale() {
      console.log("rescale")
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyUndoableAction)

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
