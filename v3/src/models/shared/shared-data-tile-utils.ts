import { IDataSet } from "../data/data-set"
import { ITileContentModel } from "../tiles/tile-content"
import { getSharedModelManager } from "../tiles/tile-environment"
import { ITileModel } from "../tiles/tile-model"
import { ISharedCaseMetadata, isSharedCaseMetadata, SharedCaseMetadata } from "./shared-case-metadata"
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
  const sharedCaseMetadata = getTileSharedModels(tile).find(m => isSharedCaseMetadata(m))
  return isSharedCaseMetadata(sharedCaseMetadata) ? sharedCaseMetadata : undefined
}

export function getAllTileCaseMetadata(tile: ITileContentModel): ISharedCaseMetadata[] {
  return getTileSharedModels(tile).filter(m => isSharedCaseMetadata(m))
}

export function addDataSetAndMetadata(tile: ITileModel, dataSet: IDataSet, isProvider = true) {
  const sharedModelManager = getSharedModelManager(tile)
  if (sharedModelManager) {
    const sharedModel = SharedDataSet.create({ providerId: tile.id })
    sharedModel.setDataSet(dataSet)
    // so values are captured in undo/redo patches
    dataSet.prepareSnapshot()
    sharedModelManager?.addTileSharedModel(tile.content, sharedModel, isProvider)

    const caseMetadata = SharedCaseMetadata.create()
    caseMetadata.setData(dataSet)
    sharedModelManager?.addSharedModel(caseMetadata)

    dataSet.completeSnapshot()

    return { sharedData: sharedModel, caseMetadata }
  }
}
