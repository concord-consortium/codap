import {Layer, Map as LeafletMap} from "leaflet"
import {comparer, reaction, when} from "mobx"
import {addDisposer, getSnapshot, Instance, SnapshotIn, types} from "mobx-state-tree"
import { AttributeType } from "../../../models/data/attribute-types"
import {IDataSet} from "../../../models/data/data-set"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {withoutUndo} from "../../../models/history/without-undo"
import {ISharedDataSet, kSharedDataSetType, SharedDataSet} from "../../../models/shared/shared-data-set"
import { getDataSetFromId } from "../../../models/shared/shared-data-utils"
import {ITileContentModel, ITileContentSnapshot} from "../../../models/tiles/tile-content"
import { getFormulaManager } from "../../../models/tiles/tile-environment"
import { getCollectionAttrs } from "../../../models/data/data-set-utils"
import { typeV3Id } from "../../../utilities/codap-utils"
import {GraphPlace} from "../../axis-graph-shared"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import { IDataDisplayLayerModel } from "../../data-display/models/data-display-layer-model"
import {kMapModelName, kMapTileType} from "../map-defs"
import {ILatLngSnapshot, LatLngModel} from "../map-model-types"
import {BaseMapKey, BaseMapKeys, kMapBoundsExtensionFactor} from "../map-types"
import { DataSetMapAttributes } from "../utilities/data-set-map-attributes"
import { collectPolygonVertexLngs, computeBoundsFromCoordinates, expandLatLngBounds } from "../utilities/map-utils"
import {LeafletMapState} from "./leaflet-map-state"
import { IMapLayerModel, isMapLayerModel } from "./map-layer-model"
import { isMapPinLayerModel, MapPinLayerModel } from "./map-pin-layer-model"
import { isMapPointLayerModel, MapPointLayerModel } from "./map-point-layer-model"
import { isMapPolygonLayerModel, MapPolygonLayerModel } from "./map-polygon-layer-model"

/**
 * Checks if a layer's dataset was deleted. This is true when:
 * - The layer has attribute assignments (meaning it was connected to a dataset)
 * - But the dataset reference is now undefined (because the dataset was removed)
 *
 * This allows us to distinguish between:
 * - A new layer that was never assigned to a dataset (should be assigned)
 * - A layer whose dataset was deleted (should be removed, not reassigned)
 */
function wasLayerDatasetDeleted(layer: IMapLayerModel): boolean {
  const hasDataset = layer.dataConfiguration.dataset != null
  if (hasDataset) return false // Dataset still exists

  // Check if the layer had attribute assignments (indicating it was previously connected)
  if (isMapPolygonLayerModel(layer)) {
    return layer.boundaryAttributeId != null
  }
  if (isMapPointLayerModel(layer)) {
    return layer.pointAttributes != null
  }
  if (isMapPinLayerModel(layer)) {
    return layer.pinAttributes != null
  }
  return false
}

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
    id: typeV3Id("MPCM"),
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
    get layerIndexMap() {
      const layerIndexMap = new Map<string, number>()
      self.layers.forEach((layer, index) => {
        layerIndexMap.set(layer.id, index)
      })
      return layerIndexMap
    },
    get latLongBounds() {
      const allLats: number[] = []
      const allLngs: number[] = []

      // Collect lat/lng values from point/pin data layers
      self.layers.forEach(({dataConfiguration}) => {
        allLats.push(...dataConfiguration.numericValuesForAttrRole('lat'))
        allLngs.push(...dataConfiguration.numericValuesForAttrRole('long'))
      })

      // Use Leaflet's getBounds() for polygon layers (efficient, no vertex iteration)
      self.leafletMap?.eachLayer((layer: Layer) => {
        if (typeof (layer as any).getBounds === 'function') {
          const bounds = (layer as any).getBounds()
          if (bounds?.isValid()) {
            allLats.push(bounds.getSouth(), bounds.getNorth())
            allLngs.push(bounds.getWest(), bounds.getEast())
          }
        }
      })

      // If longitudes span > 180°, data may cross the date line. Polygon getBounds()
      // returns a naive min/max that spans the wrong way across the globe in that case.
      // Replace polygon bounds longitudes with actual vertex longitudes so the rational
      // longitude algorithm in computeBoundsFromCoordinates can find the compact range.
      if (allLngs.length > 0) {
        let lngMin = Infinity, lngMax = -Infinity
        for (const lng of allLngs) { if (lng < lngMin) lngMin = lng; if (lng > lngMax) lngMax = lng }
        if (lngMax - lngMin > 180) {
          allLngs.length = 0
          self.layers.forEach(({dataConfiguration}) => {
            allLngs.push(...dataConfiguration.numericValuesForAttrRole('long'))
          })
          collectPolygonVertexLngs(self.leafletMap, allLngs)
        }
      }

      return computeBoundsFromCoordinates(allLats, allLngs)
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
    get dataConfigurationArrFromLayers(): IDataConfigurationModel[] {
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
    // Each layer can have one legend attribute. The layer that can handle the given legend attribute must be visible.
    // Priority is given to the layer whose collection for its GIS attribute is closest to the collection of the
    // legend attribute.
    setLegendAttribute(datasetID: string, attributeID: string, type?: AttributeType) {
      const layerIsMapLayerAndIsVisible = (layer: IDataDisplayLayerModel) => {
        return isMapLayerModel(layer) && layer.isVisible
      }
      const getCollectionIndex = (dataset: IDataSet, attrID: string) => {
        return dataset.collections.findIndex(col => {
          return getCollectionAttrs(col, dataset).some(attr => attr.id === attrID)
        })
      }
      const getGisCollectionIndex = (layer: IMapLayerModel) => {
        const gisAttributeRole = isMapPointLayerModel(layer) ? 'lat'
          : isMapPolygonLayerModel(layer) ? 'polygon' : 'pinLat'
        const gisAttributeId = layer.dataConfiguration.attributeID(gisAttributeRole)
        if (!layer.data) return -1
        return getCollectionIndex(layer.data, gisAttributeId)
      }

      const legendDataset = getDataSetFromId(self, datasetID)
      const legendCollectionIndex = getCollectionIndex(legendDataset!, attributeID)
      if (!legendDataset || legendCollectionIndex < 0) return
      const candidateLayers = self.layers.slice()
          .filter(layer => layerIsMapLayerAndIsVisible(layer) && layer.data?.id === datasetID)
          .filter(layer => {
            const gisAttrCollectionIndex = getGisCollectionIndex(layer as IMapLayerModel)
            return gisAttrCollectionIndex >= legendCollectionIndex
      }).sort((layerA, layerB) => {
        const aIndex = getGisCollectionIndex(layerA as IMapLayerModel),
          bIndex = getGisCollectionIndex(layerB as IMapLayerModel)
        return aIndex - bIndex
      })
      if (candidateLayers.length > 0) {
        candidateLayers[0].dataConfiguration.setAttribute('legend', {attributeID, type})
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
    addPointLayer(dataSet: IDataSet, latAttrId: string, longAttrId: string) {
      const newPointLayer = MapPointLayerModel.create({layerIndex: self.layers.length})
      self.layers.push(newPointLayer) // We have to do this first so safe references will work
      newPointLayer.setPointAttributes(dataSet, latAttrId, longAttrId)
      return newPointLayer
    },
    addPolygonLayer(dataSet: IDataSet, polygonAttrId: string) {
      const newPolygonLayer = MapPolygonLayerModel.create({layerIndex: self.layers.length})
      self.layers.push(newPolygonLayer) // We have to do this first so safe references will work
      newPolygonLayer.setBoundaryAttribute(dataSet, polygonAttrId)
      return newPolygonLayer
    },
    addPinLayer(dataSet: IDataSet, pinLatAttrId: string, pinLongAttrId: string) {
      const newPinLayer = MapPinLayerModel.create()
      self.layers.push(newPinLayer) // We have to do this first so safe references will work
      newPinLayer.setPinAttributes(dataSet, pinLatAttrId, pinLongAttrId)
      return newPinLayer
    }
  }))
  .actions(self => ({
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
          const allDSMapAttrs = sharedDataSets.map(sharedDataSet => new DataSetMapAttributes(sharedDataSet.dataSet))
          const matchedLayers = self.layers.filter(layer => {
            return allDSMapAttrs.some(dsMapAttrs => isMapLayerModel(layer) && dsMapAttrs.matchMapLayer(layer))
          })
          const unmatchedLayers = self.layers.filter(layer => {
            return !matchedLayers.includes(layer)
          })

          // Collect indices of layers to remove (will remove from highest to lowest to preserve indices)
          const layerIndicesToRemove: number[] = []

          // Handle unmatched layers: remove layers whose dataset was deleted,
          // assign new layers to datasets with available attributes
          unmatchedLayers.forEach(layer => {
            if (!isMapLayerModel(layer)) return

            // If the layer's dataset was deleted, remove it (don't reassign to another dataset)
            if (wasLayerDatasetDeleted(layer)) {
              layerIndicesToRemove.push(self.layers.indexOf(layer))
              return
            }

            // Layer never had a dataset assigned; try to assign it to a dataset with available attributes
            if (isMapPolygonLayerModel(layer)) {
              const dsWithBoundaryAttr = allDSMapAttrs.find(dsMapAttrs => dsMapAttrs.hasUnassignedBoundaryAttributes)
              const boundaryAttribute = dsWithBoundaryAttr?.assignFirstUnassignedBoundaryAttribute()
              if (dsWithBoundaryAttr && boundaryAttribute) {
                layer.setBoundaryAttribute(dsWithBoundaryAttr.dataSet, boundaryAttribute)
              }
              else {
                // No available boundary attribute; remove the layer
                layerIndicesToRemove.push(self.layers.indexOf(layer))
              }
            }
            if (isMapPointLayerModel(layer)) {
              const dsWithPointAttrs = allDSMapAttrs.find(dsMapAttrs => dsMapAttrs.hasUnassignedPointAttributes)
              const latLongAttrs = dsWithPointAttrs?.assignFirstUnassignedPointAttributes()
              if (dsWithPointAttrs && latLongAttrs) {
                layer.setPointAttributes(dsWithPointAttrs.dataSet, latLongAttrs.latId, latLongAttrs.longId)
              }
              else {
                // No available point attributes; remove the layer
                layerIndicesToRemove.push(self.layers.indexOf(layer))
              }
            }
            if (isMapPinLayerModel(layer)) {
              const dsWithPinAttrs = allDSMapAttrs.find(dsMapAttrs => dsMapAttrs.hasUnassignedPinAttributes)
              const latLongAttrs = dsWithPinAttrs?.assignFirstUnassignedPinAttributes()
              if (dsWithPinAttrs && latLongAttrs) {
                layer.setPinAttributes(dsWithPinAttrs.dataSet, latLongAttrs.latId, latLongAttrs.longId)
              }
              else {
                // No available pin attributes; remove the layer
                layerIndicesToRemove.push(self.layers.indexOf(layer))
              }
            }
          })

          // Remove layers from highest index to lowest to preserve indices during removal
          layerIndicesToRemove.sort((a, b) => b - a).forEach(index => {
            if (index >= 0) {
              self.layers.splice(index, 1)
            }
          })
          // add new layers for any remaining unassigned attributes
          allDSMapAttrs.forEach(dsMapAttrs => {
            while (dsMapAttrs.hasUnassignedMapAttributes) {
              if (dsMapAttrs.hasUnassignedPointAttributes) {
                const latLongAttrs = dsMapAttrs.assignFirstUnassignedPointAttributes()
                if (latLongAttrs) {
                  self.addPointLayer(dsMapAttrs.dataSet, latLongAttrs.latId, latLongAttrs.longId)
                }
              }
              if (dsMapAttrs.hasUnassignedBoundaryAttributes) {
                const boundaryAttrId = dsMapAttrs.assignFirstUnassignedBoundaryAttribute()
                if (boundaryAttrId) {
                  self.addPolygonLayer(dsMapAttrs.dataSet, boundaryAttrId)
                }
              }
              if (dsMapAttrs.hasUnassignedPinAttributes) {
                const latLongAttrs = dsMapAttrs.assignFirstUnassignedPinAttributes()
                if (latLongAttrs) {
                  self.addPinLayer(dsMapAttrs.dataSet, latLongAttrs.latId, latLongAttrs.longId)
                }
              }
            }
          })
          self.isSharedDataInitialized = true
        },
        {name: "MapContentModel.respondToSharedDatasetsChanges", fireImmediately: true}))
    },
    setLeafletMap(leafletMap: LeafletMap) {
      withoutUndo({ noDirty: true })
      self.leafletMap = leafletMap
      self.leafletMapState.setLeafletMap(leafletMap)
    },
    setHasBeenInitialized() {
      // TODO: withoutUndo should be unnecessary since isLeafletMapInitialized is volatile
      withoutUndo({ noDirty: true })
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

export function isMapModelContentSnapshot(snap?: ITileContentSnapshot): snap is IMapModelContentSnapshot {
  return snap?.type === kMapTileType
}
