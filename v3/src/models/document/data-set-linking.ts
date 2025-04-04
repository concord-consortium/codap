import { IDataSet } from "../data/data-set"
import { DataSetMetadata, kDataSetMetadataType, IDataSetMetadata } from "../shared/data-set-metadata"
import { SharedDataSet, kSharedDataSetType, ISharedDataSet, isSharedDataSet } from "../shared/shared-data-set"
import { getTileSharedModels } from "../shared/shared-data-tile-utils"
import { ITileContentModel } from "../tiles/tile-content"
import { getSharedModelManager } from "../tiles/tile-environment"
import { ITileModel } from "../tiles/tile-model"

export function isTileLinkedToDataSet(tile: ITileContentModel, dataSet: IDataSet) {
  const sharedModels = getTileSharedModels(tile)
  return !!sharedModels.find(sharedModel => isSharedDataSet(sharedModel) && sharedModel.dataSet.id === dataSet.id)
}

export function isTileLinkedToOtherDataSet(tile: ITileContentModel, dataSet: IDataSet) {
  const sharedModels = getTileSharedModels(tile)
  return !!sharedModels.find(sharedModel => isSharedDataSet(sharedModel) && sharedModel.dataSet.id !== dataSet.id)
}

// adds references to the specified tile to the specified SharedDataSet and its DataSetMetadata
export function linkTileToDataSet(tile: ITileModel, dataSet: IDataSet) {
  const tileContent = tile.content
  if (isTileLinkedToOtherDataSet(tileContent, dataSet)) {
    unlinkTileFromDataSets(tileContent)
  }

  const sharedModelManager = getSharedModelManager(tile)
  const sharedDataSets = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
  const sharedDataSet = sharedDataSets?.find(model => model.dataSet.id === dataSet.id) as ISharedDataSet | undefined
  if (sharedModelManager && sharedDataSet) {
    sharedModelManager.addTileSharedModel(tileContent, sharedDataSet)

    const sharedMetadata = sharedModelManager.getSharedModelsByType<typeof DataSetMetadata>(kDataSetMetadataType)
    const sharedCaseMetadata: IDataSetMetadata | undefined =
      sharedMetadata.find(model => model.data?.id === dataSet.id)
    sharedCaseMetadata && sharedModelManager.addTileSharedModel(tileContent, sharedCaseMetadata)
    sharedCaseMetadata?.setCaseTableTileId(tile.id)
  }
}

// removes references to the specified tile from SharedDataSet and DataSetMetadata models
export function unlinkTileFromDataSets(tile: ITileContentModel) {
  const sharedModelManager = getSharedModelManager(tile)
  const sharedModels = sharedModelManager?.getTileSharedModels(tile) ?? []
  sharedModelManager && sharedModels.forEach(sharedModel => {
    if (sharedModel.type === kSharedDataSetType || sharedModel.type === kDataSetMetadataType) {
      sharedModelManager.removeTileSharedModel(tile, sharedModel)
    }
  })
}
