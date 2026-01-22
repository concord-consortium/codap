import { Map as LeafletMap } from "leaflet"
import { DataSet } from "../../../models/data/data-set"
import { DocumentContentModel, IDocumentContentModel } from "../../../models/document/document-content"
import { FreeTileRow } from "../../../models/document/free-tile-row"
import {
  ISharedModelDocumentManager, SharedModelDocumentManager
} from "../../../models/document/shared-model-document-manager"
import { SharedDataSet } from "../../../models/shared/shared-data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { kMapTileType } from "../map-defs"
import "../map-registration"
import { isMapContentModel, IMapContentModel } from "./map-content-model"
import { isMapPointLayerModel } from "./map-point-layer-model"
import { isMapPolygonLayerModel } from "./map-polygon-layer-model"

// Mock leaflet map for testing
const mockLeafletMap = {
  on: jest.fn(),
  off: jest.fn(),
  getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
  getZoom: jest.fn(() => 1),
  getBounds: jest.fn(() => ({
    getSouth: () => -90,
    getNorth: () => 90,
    getWest: () => -180,
    getEast: () => 180
  })),
  setView: jest.fn(),
  fitBounds: jest.fn(),
  invalidateSize: jest.fn()
} as unknown as LeafletMap

describe("MapContentModel", () => {
  let sharedModelManager: ISharedModelDocumentManager
  let docContent: IDocumentContentModel
  let mapContent: IMapContentModel

  beforeEach(() => {
    sharedModelManager = new SharedModelDocumentManager()
    docContent = DocumentContentModel.create({}, { sharedModelManager })
    docContent.setRowCreator(() => FreeTileRow.create())
    sharedModelManager.setDocument(docContent)

    // Create a map tile
    const tile = docContent.insertTileSnapshotInDefaultRow({
      content: { type: kMapTileType }
    })
    // Tile should be defined - if not, tests will fail meaningfully
    const content = tile && isMapContentModel(tile.content) ? tile.content : undefined
    mapContent = content!

    // Set the mock leaflet map to trigger reactions
    mapContent.setLeafletMap(mockLeafletMap)
  })

  describe("layer removal on dataset deletion", () => {
    it("removes point layers when their dataset is deleted", async () => {
      // Create a dataset with lat/long attributes
      const dataSet = DataSet.create({ name: "points" })
      dataSet.addAttribute({ id: "lat", name: "Latitude" })
      dataSet.addAttribute({ id: "long", name: "Longitude" })

      // Add dataset to shared model manager
      const sharedDataSet = SharedDataSet.create()
      sharedDataSet.setDataSet(dataSet)
      const metadata = DataSetMetadata.create({ data: dataSet.id })
      sharedModelManager.addSharedModel(sharedDataSet)
      sharedModelManager.addSharedModel(metadata)

      // Wait for the map's reaction to add layers
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify the point layer was created
      expect(mapContent.layers.length).toBe(1)
      expect(isMapPointLayerModel(mapContent.layers[0])).toBe(true)

      // Check the layer's dataset reference before removal
      const layer = mapContent.layers[0]
      expect(layer.dataConfiguration.dataset?.id).toBe(dataSet.id)

      // Remove the dataset (pass the DataSet ID, not the SharedDataSet ID)
      sharedModelManager.removeSharedModel(dataSet.id)

      // Wait for the map's reaction to remove layers
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify the layer was removed
      expect(mapContent.layers.length).toBe(0)
    })

    it("removes polygon layers when their dataset is deleted", async () => {
      // Create a dataset with boundary attribute
      const dataSet = DataSet.create({ name: "boundaries" })
      dataSet.addAttribute({ id: "boundary", name: "Boundary", userType: "boundary" })

      // Add dataset to shared model manager
      const sharedDataSet = SharedDataSet.create()
      sharedDataSet.setDataSet(dataSet)
      const metadata = DataSetMetadata.create({ data: dataSet.id })
      sharedModelManager.addSharedModel(sharedDataSet)
      sharedModelManager.addSharedModel(metadata)

      // Wait for the map's reaction to add layers
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify the polygon layer was created
      expect(mapContent.layers.length).toBe(1)
      expect(isMapPolygonLayerModel(mapContent.layers[0])).toBe(true)

      // Remove the dataset (pass the DataSet ID, not the SharedDataSet ID)
      sharedModelManager.removeSharedModel(dataSet.id)

      // Wait for the map's reaction to remove layers
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify the layer was removed
      expect(mapContent.layers.length).toBe(0)
    })

    it("does not reassign layers to another dataset when their dataset is deleted", async () => {
      // Create first dataset with lat/long attributes
      const dataSet1 = DataSet.create({ name: "points1" })
      dataSet1.addAttribute({ id: "lat1", name: "Latitude" })
      dataSet1.addAttribute({ id: "long1", name: "Longitude" })

      // Create second dataset with lat/long attributes
      const dataSet2 = DataSet.create({ name: "points2" })
      dataSet2.addAttribute({ id: "lat2", name: "Latitude" })
      dataSet2.addAttribute({ id: "long2", name: "Longitude" })

      // Add both datasets to shared model manager
      const sharedDataSet1 = SharedDataSet.create()
      sharedDataSet1.setDataSet(dataSet1)
      const metadata1 = DataSetMetadata.create({ data: dataSet1.id })
      sharedModelManager.addSharedModel(sharedDataSet1)
      sharedModelManager.addSharedModel(metadata1)

      const sharedDataSet2 = SharedDataSet.create()
      sharedDataSet2.setDataSet(dataSet2)
      const metadata2 = DataSetMetadata.create({ data: dataSet2.id })
      sharedModelManager.addSharedModel(sharedDataSet2)
      sharedModelManager.addSharedModel(metadata2)

      // Wait for the map's reaction to add layers
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify both point layers were created (one for each dataset)
      expect(mapContent.layers.length).toBe(2)
      const layer1 = mapContent.layers.find(layer =>
        isMapPointLayerModel(layer) && layer.dataConfiguration.dataset?.id === dataSet1.id
      )
      const layer2 = mapContent.layers.find(layer =>
        isMapPointLayerModel(layer) && layer.dataConfiguration.dataset?.id === dataSet2.id
      )
      expect(layer1).toBeDefined()
      expect(layer2).toBeDefined()

      // Remove the first dataset (pass the DataSet ID, not the SharedDataSet ID)
      sharedModelManager.removeSharedModel(dataSet1.id)

      // Wait for the map's reaction
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify only the layer for the second dataset remains
      // The layer for the first dataset should be removed (not reassigned to dataset2)
      expect(mapContent.layers.length).toBe(1)
      const remainingLayer = mapContent.layers[0]
      expect(isMapPointLayerModel(remainingLayer)).toBe(true)
      // At this point we've verified it's a point layer, so we can safely check its dataset
      expect(remainingLayer.dataConfiguration.dataset?.id).toBe(dataSet2.id)
    })
  })
})
