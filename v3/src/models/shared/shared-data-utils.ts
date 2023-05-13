import { IAnyStateTreeNode } from "@concord-consortium/mobx-state-tree"
import { IDataSet } from "../data/data-set"
import { ITileContentModel } from "../tiles/tile-content"
import { getSharedModelManager } from "../tiles/tile-environment"
import {
  ISharedCaseMetadata, isSharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata
} from "./shared-case-metadata"
import { ISharedDataSet, isSharedDataSet, kSharedDataSetType, SharedDataSet } from "./shared-data-set"

export function getSharedDataSets(node: IAnyStateTreeNode): ISharedDataSet[] {
  const sharedModelManager = getSharedModelManager(node)
  return sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
}

export function getDataSetFromId(node: IAnyStateTreeNode, id: string): IDataSet | undefined {
  const sharedDataSets = getSharedDataSets(node)
  const sharedDataSet = sharedDataSets.find(model => model.dataSet.id === id)
  return sharedDataSet?.dataSet
}

export function getTileSharedModels(tile: ITileContentModel) {
  const sharedModelManager = getSharedModelManager(tile)
  return sharedModelManager?.getTileSharedModels(tile) ?? []
}

export function getTileDataSet(tile: ITileContentModel): IDataSet | undefined {
  const sharedDataSet = getTileSharedModels(tile).find(m => isSharedDataSet(m))
  return isSharedDataSet(sharedDataSet) ? sharedDataSet.dataSet : undefined
}

export function getTileCaseMetadata(tile: ITileContentModel) {
  const sharedCaseMetadata = getTileSharedModels(tile).find(m => isSharedCaseMetadata(m))
  return isSharedCaseMetadata(sharedCaseMetadata) ? sharedCaseMetadata : undefined
}

export function isTileLinkedToDataSet(tile: ITileContentModel, dataSet: IDataSet) {
  const sharedModels = getTileSharedModels(tile)
  return !!sharedModels.find(sharedModel => isSharedDataSet(sharedModel) && sharedModel.dataSet.id === dataSet.id)
}

export function isTileLinkedToOtherDataSet(tile: ITileContentModel, dataSet: IDataSet) {
  const sharedModels = getTileSharedModels(tile)
  return !!sharedModels.find(sharedModel => isSharedDataSet(sharedModel) && sharedModel.dataSet.id !== dataSet.id)
}

export function unlinkTileFromDataSets(tile: ITileContentModel) {
  const sharedModelManager = getSharedModelManager(tile)
  const sharedModels = sharedModelManager?.getTileSharedModels(tile) ?? []
  sharedModelManager && sharedModels.forEach(sharedModel => {
    if (sharedModel.type === kSharedDataSetType || sharedModel.type === kSharedCaseMetadataType) {
      sharedModelManager.removeTileSharedModel(tile, sharedModel)
    }
  })
}

export function linkTileToDataSet(tile: ITileContentModel, dataSet: IDataSet) {
  if (isTileLinkedToOtherDataSet(tile, dataSet)) {
    unlinkTileFromDataSets(tile)
  }

  const sharedModelManager = getSharedModelManager(tile)
  const sharedDataSets = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
  const sharedDataSet = sharedDataSets?.find(model => model.dataSet.id === dataSet.id) as ISharedDataSet | undefined
  if (sharedModelManager && sharedDataSet) {
    sharedModelManager.addTileSharedModel(tile, sharedDataSet)

    const sharedMetadata = sharedModelManager.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
    const sharedCaseMetadata: ISharedCaseMetadata | undefined =
            sharedMetadata.find(model => model.data?.id === dataSet.id)
    sharedCaseMetadata && sharedModelManager.addTileSharedModel(tile, sharedCaseMetadata)
  }
}

export function wrapSerialization<T>(node: IAnyStateTreeNode, serializeFn: () => T) {
  const sharedDataSets = getSharedDataSets(node)
  try {
    // prepare each data set for serialization
    sharedDataSets.forEach(model => model.dataSet.prepareSnapshot())

    // perform the serialization with the prepared data sets
    return serializeFn()
  }
  finally {
    // complete the serialization process for each data set
    sharedDataSets.forEach(model => model.dataSet.completeSnapshot())
  }
}
