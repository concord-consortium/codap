import {LatLngBounds, Layer, Map as LeafletMap, Polygon} from "leaflet"
import {comparer, reaction, when} from "mobx"
import {addDisposer, getSnapshot, Instance, SnapshotIn, types} from "mobx-state-tree"
import { AttributeType } from "../../../models/data/attribute-types"
import {IDataSet} from "../../../models/data/data-set"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {withoutUndo} from "../../../models/history/without-undo"
import {ISharedDataSet, kSharedDataSetType, SharedDataSet} from "../../../models/shared/shared-data-set"
import {getMetadataFromDataSet} from "../../../models/shared/shared-data-utils"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import { getFormulaManager } from "../../../models/tiles/tile-environment"
import {typedId} from "../../../utilities/js-utils"
import {GraphPlace} from "../../axis-graph-shared"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {kMapModelName, kMapTileType} from "../map-defs"
import {BaseMapKey, BaseMapKeys, kMapBoundsExtensionFactor} from "../map-types"
import {
  datasetHasBoundaryData, datasetHasLatLongData, datasetHasPinData, expandLatLngBounds, getLatLongBounds,
  latLongAttributesFromDataSet, pinAttributesFromDataSet
} from "../utilities/map-utils"
import {ILatLngSnapshot, LatLngModel} from "../map-model-types"
import {LeafletMapState} from "./leaflet-map-state"
import {isMapLayerModel} from "./map-layer-model"
import { isMapPinLayerModel, MapPinLayerModel } from "./map-pin-layer-model"
import {isMapPointLayerModel, MapPointLayerModel} from "./map-point-layer-model"
import {isMapPolygonLayerModel, MapPolygonLayerModel} from "./map-polygon-layer-model"

export const GeoRasterModel = types.model("GeoRasterModel", {
  /**
   * The image type of the raster. Currently only png is supported.
   */
  type: types.enumeration(["png"]),
  url: types.string,
  opacity: types.optional(types.number, 0.5),
  // In the future we may want to add additional properties:
  // - bounds: the latitude/longitude bounds of the raster,
  //   currently it is assumed to be -90 to 90 latitude and -180 to 180 longitude
  // - projection: the EPSG code of the projection of the image,
  //   currently it is assumed to be EPSG:4326
  // These are not added now because they aren't needed yet and would just complicate
  // the code.
})

export interface IGeoRasterModel extends Instance<typeof GeoRasterModel> {}

export const MapContentModel = DataDisplayContentModel
  .named(kMapModelName)
  .props({
    id: types.optional(types.string, () => typedId("MPCM")),
    type: types.optional(types.literal(kMapTileType), kMapTileType),

    // center and zoom are kept in sync with Leaflet's map state
    center: types.optional(LatLngModel, () => LatLngModel.create()),
    zoom: -1, // -1 means no zoom has yet been set

    // This is the name of the layer used as an argument to L.esri.basemapLayer
    baseMapLayerName: types.optional(types.enumeration([...BaseMapKeys]), 'topo'),

    // Changes the visibility of the layer in Leaflet with the opacity parameter
    baseMapLayerIsVisible: true,
    plotBackgroundColor: '#FFFFFF01',

    geoRaster: types.maybe(GeoRasterModel),
  })
  .volatile(() => ({
    leafletMap: undefined as LeafletMap | undefined,
    leafletMapState: new LeafletMapState(),
    isLeafletMapInitialized: false,
    isSharedDataInitialized: false,
    // used to track whether a given change was initiated by leaflet or CODAP
    syncFromLeafletCount: 0,
    syncFromLeafletResponseCount: 0,
    _ignoreLeafletClicks: false,
  }))
  .views(self => ({
    get latLongBounds() {
      let overallBounds: LatLngBounds | undefined

      const applyBounds = (bounds: LatLngBounds | undefined) => {
        if (bounds) {
          if (overallBounds) {
            overallBounds.extend(bounds)
          } else {
            overallBounds = bounds
          }
        }
      }

      self.layers.forEach(({dataConfiguration}) => {
        applyBounds(getLatLongBounds(dataConfiguration))
      })
      self.leafletMap?.eachLayer(function (iLayer: Layer) {
        const polygon = iLayer as Polygon
        polygon.getBounds && applyBounds(polygon.getBounds())
      })

      return overallBounds
    },
    get datasetsArray(): IDataSet[] {
      const datasets: IDataSet[] = []
      self.layers.filter(isMapLayerModel).forEach(layer => {
        const dataset = layer.dataConfiguration.dataset
        if (dataset) {
          datasets.push(dataset)
        }
      })
      return datasets
    },
    get dataCongurationArrFromLayers(): IDataConfigurationModel[] {
      const dataConfigurations: IDataConfigurationModel[] = []
      self.layers.filter(isMapLayerModel).forEach(layer => {
        const dataConfiguration = layer.dataConfiguration
        if (dataConfiguration) {
          dataConfigurations.push(dataConfiguration)
        }
      })
      return dataConfigurations
    }
  }))
  .actions(self => ({
    // Each layer can have one legend attribute. The layer that can handle the given legend attribute must already
    // be present in the layers array
    setLegendAttribute(datasetID: string, attributeID: string, type?: AttributeType) {
      const foundLayer = self.layers.find(layer => layer.data?.id === datasetID)
      if (foundLayer) {
        foundLayer.dataConfiguration.setAttribute('legend', {attributeID, type})
      }
    },
    setCenterAndZoom(center: ILatLngSnapshot, zoom: number) {
      self.center = center
      self.zoom = zoom
    },
    setGeoRaster(geoRaster: Maybe<IGeoRasterModel>) {
      self.geoRaster = geoRaster
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)
  .actions(self => ({
    syncLeafletResponseCount(count: number) {
      self.syncFromLeafletResponseCount = count
    },
    syncCenterAndZoomFromMap() {
      if (self.leafletMap) {
        ++self.syncFromLeafletCount
        self.setCenterAndZoom(self.leafletMap.getCenter(), self.leafletMap.getZoom())
      }
    },
    syncCenterAndZoomFromMapWithoutUndo() {
      withoutUndo()
      this.syncCenterAndZoomFromMap()
    },
    rescale(undoStringKey = "", redoStringKey = "") {
      const bounds = self.latLongBounds
      if (bounds) {
        self.leafletMapState.adjustMapView({
          fitBounds: expandLatLngBounds(bounds, kMapBoundsExtensionFactor),
          animate: !!undoStringKey && !!redoStringKey,
          undoStringKey, redoStringKey
        })
      }
    },
    setBaseMapLayerName(name: BaseMapKey) {
      self.baseMapLayerName = name
    },
    setBaseMapLayerVisibility(isVisible: boolean) {
      self.baseMapLayerIsVisible = isVisible
    },
    ignoreLeafletClicks(ignore: boolean) {
      self._ignoreLeafletClicks = ignore
    }
  }))
  .actions(self => ({
    addPointLayer(dataSet: IDataSet) {
      const newPointLayer = MapPointLayerModel.create({layerIndex: self.layers.length})
      self.layers.push(newPointLayer) // We have to do this first so safe references will work
      const dataConfiguration = newPointLayer.dataConfiguration,
        {latId, longId} = latLongAttributesFromDataSet(dataSet)
      dataConfiguration.setDataset(dataSet, getMetadataFromDataSet(dataSet))
      dataConfiguration.setAttribute('lat', {attributeID: latId})
      dataConfiguration.setAttribute('long', {attributeID: longId})
      return newPointLayer
    },
    addPolygonLayer(dataSet: IDataSet) {
      const newPolygonLayer = MapPolygonLayerModel.create()
      self.layers.push(newPolygonLayer) // We have to do this first so safe references will work
      newPolygonLayer.setDataset(dataSet)
      return newPolygonLayer
    },
    addPinLayer(dataSet: IDataSet) {
      const newPinLayer = MapPinLayerModel.create()
      self.layers.push(newPinLayer) // We have to do this first so safe references will work
      const dataConfiguration = newPinLayer.dataConfiguration,
        { pinLatId, pinLongId } = pinAttributesFromDataSet(dataSet)
      dataConfiguration.setDataset(dataSet, getMetadataFromDataSet(dataSet))
      dataConfiguration.setAttribute('pinLat', {attributeID: pinLatId})
      dataConfiguration.setAttribute('pinLong', {attributeID: pinLongId})
      return newPinLayer
    },
    afterCreate() {
      addDisposer(self, () => self.leafletMapState.destroy())

      // synchronize leaflet state (center, zoom) to map model state
      addDisposer(self, reaction(
        () => {
          const {isChanging, center, zoom} = self.leafletMapState
          return {isChanging, center, zoom}
        },
        ({isChanging, center, zoom}) => {
          // Don't sync map state to model until map change is complete
          // NOTE: `isChanging` will be true when the map tile is animating into place. If the browser
          // gets slowed down `isChanging` might toggle to false and true again during this animation.
          // It usually doesn't toggle because of the debouncing in leafletMapState.
          if (!isChanging) {
            // if undo/redo strings are specified, then treat change as undoable
            if (self.leafletMapState.undoStringKey && self.leafletMapState.redoStringKey) {
              self.applyModelChange(() => {
                self.syncCenterAndZoomFromMap()
              }, {
                log: self.leafletMapState.log,
                undoStringKey: self.leafletMapState.undoStringKey,
                redoStringKey: self.leafletMapState.redoStringKey
              })
            }
            // otherwise, sync map state to model without undo
            else {
              self.syncCenterAndZoomFromMapWithoutUndo()
            }
          }
        },
        {name: "MapContentModel.afterCreate.reaction [leafletState]", equals: comparer.structural}
      ))

      // synchronize map model state to leaflet map state
      addDisposer(self, reaction(
        () => {
          const {zoom, syncFromLeafletCount} = self
          return {center: getSnapshot(self.center), zoom, syncFromLeafletCount}
        },
        ({center, zoom, syncFromLeafletCount}) => {
          // don't sync back to map if this change was initiated from the map
          if (syncFromLeafletCount > self.syncFromLeafletResponseCount) {
            self.syncLeafletResponseCount(syncFromLeafletCount)
          }
          // sync back to map if this change was initiated from model (e.g. undo/redo)
          else {
            self.leafletMapState.adjustMapView({center, zoom})
          }
        }, {name: "MapContentModel.reaction [sync mapModel => leaflet map]", equals: comparer.structural}
      ))

      // Rescale when the layers are changed
      addDisposer(self, reaction(
        () => self.layers.map(layer => layer.id),
        () => {
          if (!self.isLeafletMapInitialized) {
            // If the map hasn't been initialized yet, we shouldn't rescale it.
            // The map component size might not be its final size yet, so the
            // rescale will not work properly.
            // If necessary, it will be rescaled during initialization.
            return
          }
          self.rescale()
        },
        {name: "MapContentModel.reaction rescale when layers change", equals: comparer.structural}
      ))
    },
    afterAttachToDocument() {
      // register with the formula adapters once they've been initialized
      when(
        () => getFormulaManager(self)?.areAdaptersInitialized ?? false,
        () => {
          self.formulaAdapters.forEach(adapter => {
            adapter?.addContentModel(self)
          })
        }
      )
      // Monitor coming and going of shared datasets
      addDisposer(self, reaction(() => {
          const sharedModelManager = self.tileEnv?.sharedModelManager,
            sharedDataSets: ISharedDataSet[] = sharedModelManager?.isReady
              ? sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
              : [],
            leafletMap = self.leafletMap
          return {sharedModelManager, sharedDataSets, leafletMap}
        },
        // reaction/effect
        ({sharedModelManager, sharedDataSets, leafletMap}) => {
          if (!sharedModelManager?.isReady || !leafletMap) {
            // We aren't added to a document yet, so we can't do anything yet
            return
          }
          // We make a copy of the layers array and remove any layers that are still in the shared model
          // If there are any layers left in the copy, they are no longer in any shared dataset and should be removed
          const layersToCheck = Array.from(self.layers)
          sharedDataSets.forEach(sharedDataSet => {
            if (datasetHasLatLongData(sharedDataSet.dataSet)) {
              const pointLayer = layersToCheck.find(layer => {
                return layer.data === sharedDataSet.dataSet && isMapPointLayerModel(layer)
              })
              if (isMapPointLayerModel(pointLayer)) {
                pointLayer.setDataset(sharedDataSet.dataSet)
                layersToCheck.splice(layersToCheck.indexOf(pointLayer), 1)
              } else {
                // Add a new layer for this dataset
                this.addPointLayer(sharedDataSet.dataSet)
              }
            }
            if (datasetHasBoundaryData(sharedDataSet.dataSet)) {
              const polygonLayer = layersToCheck.find(layer => {
                return layer.data === sharedDataSet.dataSet && isMapPolygonLayerModel(layer)
              })
              if (isMapPolygonLayerModel(polygonLayer)) {
                polygonLayer.setDataset(sharedDataSet.dataSet)
                layersToCheck.splice(layersToCheck.indexOf(polygonLayer), 1)
              } else {
                // Add a new layer for this dataset
                this.addPolygonLayer(sharedDataSet.dataSet)
              }
            }
            if (datasetHasPinData(sharedDataSet.dataSet)) {
              const pinLayer = layersToCheck.find(layer => {
                return layer.data === sharedDataSet.dataSet && isMapPinLayerModel(layer)
              })
              if (isMapPinLayerModel(pinLayer)) {
                pinLayer.setDataset(sharedDataSet.dataSet)
                layersToCheck.splice(layersToCheck.indexOf(pinLayer), 1)
              } else {
                // Add a new layer for this dataset
                this.addPinLayer(sharedDataSet.dataSet)
              }
            }
          })
          // Remove any remaining layers in layersToCheck since they are no longer in any shared dataset
          layersToCheck.forEach(layer => {
            self.layers.splice(self.layers.indexOf(layer), 1)
          })
          self.isSharedDataInitialized = true
        },
        {name: "MapContentModel.respondToSharedDatasetsChanges", fireImmediately: true}))
    },
    setLeafletMap(leafletMap: LeafletMap) {
      withoutUndo()
      self.leafletMap = leafletMap
      self.leafletMapState.setLeafletMap(leafletMap)
    },
    setHasBeenInitialized() {
      // TODO: withoutUndo should be unnecessary since isLeafletMapInitialized is volatile
      withoutUndo()
      self.isLeafletMapInitialized = true
    },
    beforeDestroy() {
      self.formulaAdapters.forEach(adapter => {
        adapter?.removeContentModel(self.id)
      })
    }
  }))
  .actions(self => ({
    hideSelectedCases() {
      self.layers.forEach(layer => {
        layer.dataConfiguration?.addNewHiddenCases(
          layer.dataConfiguration.selection ?? []
        )
      })
    },
    hideUnselectedCases() {
      self.layers.forEach(layer => {
        layer.dataConfiguration?.addNewHiddenCases(
          layer.dataConfiguration.unselectedCases ?? []
        )
      })
    },
    clearHiddenCases() {
      self.layers.forEach(layer => {
        layer.dataConfiguration.clearHiddenCases()
      })
    }
  }))
  .views(self => ({
    // Return true if there is already a layer for the given dataset and attributeID is not already in use
    placeCanAcceptAttributeIDDrop(place: GraphPlace, dataset: IDataSet, attributeID: string | undefined) {
      if (dataset && attributeID) {
        const foundLayer = self.layers.find(layer => layer.data === dataset)
        return !!foundLayer && foundLayer.dataConfiguration.attributeID('legend') !== attributeID
      }
      return false
    },
    numSelected() {
      return self.layers.reduce((sum, layer) => sum + layer.dataConfiguration.selection.length, 0)
    },
    numUnselected() {
      return self.layers.reduce((sum, layer) => sum + layer.dataConfiguration.unselectedCases.length, 0)
    },
    numHidden() {
      return self.layers.reduce((sum, layer) => sum + layer.dataConfiguration.hiddenCases.length, 0)
    }
  }))

export interface IMapContentModel extends Instance<typeof MapContentModel> {
}

export interface IMapModelContentSnapshot extends SnapshotIn<typeof MapContentModel> {
}

export function createMapContentModel(snap?: IMapModelContentSnapshot) {
  return MapContentModel.create(snap)
}

export function isMapContentModel(model?: ITileContentModel): model is IMapContentModel {
  return model?.type === kMapTileType
}
