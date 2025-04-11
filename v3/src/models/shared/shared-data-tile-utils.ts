import { IDataSet } from "../data/data-set"
import { ITileContentModel } from "../tiles/tile-content"
import { getSharedModelManager } from "../tiles/tile-environment"
import { ITileModel } from "../tiles/tile-model"
import { IDataSetMetadata, isDataSetMetadata, DataSetMetadata } from "./data-set-metadata"
import { ISharedDataSet, isSharedDataSet, SharedDataSet } from "./shared-data-set"

export function getTileSharedModels(tile: ITileContentModel) {
  const sharedModelManager = getSharedModelManager(tile)
  return sharedModelManager?.getTileSharedModels(tile) ?? []
}

export function getTileDataSet(tile: ITileContentModel): IDataSet | undefined {
  const sharedDataSet = getTileSharedModels(tile).find(m => isSharedDataSet(m))
  return isSharedDataSet(sharedDataSet) ? sharedDataSet.dataSet : undefined
}

export function getAllTileDataSets(tile: ITileContentModel): ISharedDataSet[] {
  return getTileSharedModels(tile).filter(m => isSharedDataSet(m))
}

export function getTileCaseMetadata(tile: ITileContentModel) {
  const sharedCaseMetadata = getTileSharedModels(tile).find(m => isDataSetMetadata(m))
  return isDataSetMetadata(sharedCaseMetadata) ? sharedCaseMetadata : undefined
}

export function getAllTileCaseMetadata(tile: ITileContentModel): IDataSetMetadata[] {
  return getTileSharedModels(tile).filter(m => isDataSetMetadata(m))
}

export function addDataSetAndMetadata(tile: ITileModel, dataSet: IDataSet, isProvider = true) {
  const sharedModelManager = getSharedModelManager(tile)
  if (sharedModelManager) {
    const sharedData = SharedDataSet.create({ providerId: tile.id })
    sharedData.setDataSet(dataSet)
    // so values are captured in undo/redo patches
    dataSet.prepareSnapshot()
    sharedModelManager?.addTileSharedModel(tile.content, sharedData, isProvider)

    const sharedMetadata = DataSetMetadata.create()
    sharedMetadata.setData(dataSet)
    sharedModelManager?.addTileSharedModel(tile.content, sharedMetadata, isProvider)

    dataSet.completeSnapshot()

    return { sharedData, sharedMetadata }
  }
}
