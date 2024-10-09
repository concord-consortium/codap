import { IAnyStateTreeNode } from "mobx-state-tree"
import { toV2Id } from "../../utilities/codap-utils"
import { IDataSet } from "../data/data-set"
import { ITileContentModel } from "../tiles/tile-content"
import { ITileModel } from "../tiles/tile-model"
import { getSharedModelManager } from "../tiles/tile-environment"
import {
  ISharedCaseMetadata, isSharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata
} from "./shared-case-metadata"
import { ISharedDataSet, isSharedDataSet, kSharedDataSetType, SharedDataSet } from "./shared-data-set"

export function getSharedDataSets(node: IAnyStateTreeNode): ISharedDataSet[] {
  const sharedModelManager = getSharedModelManager(node)
  return sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
}

export function getDataSetByNameOrId(node: IAnyStateTreeNode, nameOrId?: string): Maybe<IDataSet> {
  return getSharedDataSets(node).find(({ dataSet }) => {
    return dataSet.id === nameOrId || dataSet.name === nameOrId || `${toV2Id(dataSet.id)}` === nameOrId
  })?.dataSet
}

export function getSharedDataSetFromDataSetId(node: IAnyStateTreeNode, id: string): ISharedDataSet | undefined {
  const sharedDataSets = getSharedDataSets(node)
  return sharedDataSets.find(model => model.dataSet.id === id)
}

export function getDataSetFromId(node: IAnyStateTreeNode, id: string): IDataSet | undefined {
  const sharedDataSets = getSharedDataSets(node)
  const sharedDataSet = sharedDataSets.find(model => model.dataSet.id === id)
  return sharedDataSet?.dataSet
}

export function getSharedCaseMetadataFromDataset(dataset: IDataSet): ISharedCaseMetadata {
  const sharedModelManager = getSharedModelManager(dataset)
  const sharedCaseMetadata = sharedModelManager?.getSharedModelsByType<typeof SharedCaseMetadata>(
    kSharedCaseMetadataType).find(model => model.data?.id === dataset.id)
  return sharedCaseMetadata as ISharedCaseMetadata
}

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

export function isTileLinkedToDataSet(tile: ITileContentModel, dataSet: IDataSet) {
  const sharedModels = getTileSharedModels(tile)
  return !!sharedModels.find(sharedModel => isSharedDataSet(sharedModel) && sharedModel.dataSet.id === dataSet.id)
}

export function isTileLinkedToOtherDataSet(tile: ITileContentModel, dataSet: IDataSet) {
  const sharedModels = getTileSharedModels(tile)
  return !!sharedModels.find(sharedModel => isSharedDataSet(sharedModel) && sharedModel.dataSet.id !== dataSet.id)
}

// removes references to the specified tile from SharedDataSet and SharedCaseMetadata tiles
export function unlinkTileFromDataSets(tile: ITileContentModel) {
  const sharedModelManager = getSharedModelManager(tile)
  const sharedModels = sharedModelManager?.getTileSharedModels(tile) ?? []
  sharedModelManager && sharedModels.forEach(sharedModel => {
    if (sharedModel.type === kSharedDataSetType || sharedModel.type === kSharedCaseMetadataType) {
      sharedModelManager.removeTileSharedModel(tile, sharedModel)
    }
  })
}

// adds references to the specified tile to the specified SharedDataSet and its SharedCaseMetadata
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

    const sharedMetadata = sharedModelManager.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
    const sharedCaseMetadata: ISharedCaseMetadata | undefined =
            sharedMetadata.find(model => model.data?.id === dataSet.id)
    sharedCaseMetadata && sharedModelManager.addTileSharedModel(tileContent, sharedCaseMetadata)
    sharedCaseMetadata?.setCaseTableTileId(tile.id)
  }
}
