import {Instance, ISerializedActionCall, SnapshotIn, types} from "mobx-state-tree"
import {createContext, useContext} from "react"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import {kMapModelName, kMapTileType} from "../map-defs"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"

export interface MapProperties {
}

export const MapContentModel = DataDisplayContentModel
  .named(kMapModelName)
  .props({
    type: types.optional(types.literal(kMapTileType), kMapTileType),

    // center and zoom are kept in sync with Leaflet's map state
    center: types.optional(types.array(types.number), [0, 0]),
    zoom: types.optional(types.number, 0),

    // This is the name of the layer used as an argument to L.esri.basemapLayer
    baseMapLayerName: types.optional(types.string, ''),

    // Changes the visibility of the layer in Leaflet with the opacity parameter
    baseMapLayerIsVisible: true,

    // There is one MapLayerModel for each layer in the map
    // mapLayerModels: types.array(types.late(() => MapLayerModel)),
  })
  .volatile(() => ({
    // This is the Leaflet map object
    map: undefined as any,
  }))
  .actions(self => ({
    // We're overriding our base model implementation because we suspect that the map
    // will be a special case that needs to be handled differently
/*
    afterAttachToDocument() {
      // Monitor our parents and update our shared model when we have a document parent
      addDisposer(self, reaction(() => {
          const sharedModelManager = self.tileEnv?.sharedModelManager

          const sharedDataSets: ISharedDataSet[] = sharedModelManager?.isReady
            ? sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
            : []

          const tileSharedModels = sharedModelManager?.isReady
            ? sharedModelManager?.getTileSharedModels(self)
            : undefined

          return {sharedModelManager, sharedDataSets, tileSharedModels}
        },
        // reaction/effect
        ({sharedModelManager, sharedDataSets, tileSharedModels}) => {
          if (!sharedModelManager?.isReady) {
            // We aren't added to a document yet, so we can't do anything yet
            return
          }

          const tileDataSet = getTileDataSet(self)
          if (self.data || self.metadata) {
            self.config.setDataset(self.data, self.metadata)
          }
          // auto-link to DataSet if it contains lat/long and/or polygons
          else if (!tileDataSet && sharedDataSets.length === 1) {
            linkTileToDataSet(self, sharedDataSets[0].dataSet)
          }
        },
        {name: "sharedModelSetup", fireImmediately: true}))
    },
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined, type: SharedModelChangeType) {
      if (type === "link") {
        self.dataConfiguration.setDataset(self.data, self.metadata)
      } else if (type === "unlink" && isSharedDataSet(sharedModel)) {
        self.dataConfiguration.setDataset(undefined, undefined)
      }
    },
*/
  }))

export interface IMapContentModel extends Instance<typeof MapContentModel> {}
export interface IMapModelContentSnapshot extends SnapshotIn<typeof MapContentModel> {}

export function createMapContentModel(snap?: IMapModelContentSnapshot) {
  return MapContentModel.create()
}

export interface SetMapVisualPropsAction extends ISerializedActionCall {
  name: "setMapVisualProps"
  args: [string | number | boolean]
}

export function isMapVisualPropsAction(action: ISerializedActionCall): action is SetMapVisualPropsAction {
  return ['setPointColor', 'setPointStrokeColor', 'setPointStrokeSameAsFill', 'setPlotBackgroundColor',
    'setPointSizeMultiplier', 'setIsTransparent'].includes(action.name)
}

export const MapContentModelContext = createContext<IMapContentModel>({} as IMapContentModel)

export const useMapContentModelContext = () => useContext(MapContentModelContext)

export function isMapContentModel(model?: ITileContentModel): model is IMapContentModel {
  return model?.type === kMapTileType
}
