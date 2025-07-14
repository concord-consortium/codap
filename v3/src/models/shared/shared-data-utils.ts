import { IAnyStateTreeNode } from "mobx-state-tree"
import { toV2Id } from "../../utilities/codap-utils"
import { IDataSet } from "../data/data-set"
import { getSharedModelManager } from "../tiles/tile-environment"
import { IDataSetMetadata, kDataSetMetadataType, DataSetMetadata } from "./data-set-metadata"
import { ISharedDataSet, kSharedDataSetType, SharedDataSet } from "./shared-data-set"

export function getSharedDataSets(node: IAnyStateTreeNode): ISharedDataSet[] {
  const sharedModelManager = getSharedModelManager(node)
  return sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
}

export function getDataSets(node: IAnyStateTreeNode): IDataSet[] {
  return getSharedDataSets(node).map(sharedDataSet => sharedDataSet.dataSet)
}

export function getDataSetByNameOrId(node: IAnyStateTreeNode, nameOrId?: string): Maybe<IDataSet> {
  return getSharedDataSets(node).find(({ dataSet }) => {
    return dataSet.id === nameOrId || dataSet.name === nameOrId || `${toV2Id(dataSet.id)}` === nameOrId
  })?.dataSet
}

export function getSharedDataSetFromDataSetId(node: IAnyStateTreeNode, id: string): Maybe<ISharedDataSet> {
  const sharedDataSets = getSharedDataSets(node)
  return sharedDataSets.find(model => model.dataSet.id === id)
}

export function getDataSetFromId(node: IAnyStateTreeNode, id: string): Maybe<IDataSet> {
  const sharedDataSets = getSharedDataSets(node)
  const sharedDataSet = sharedDataSets.find(model => model.dataSet.id === id)
  return sharedDataSet?.dataSet
}

export function getMetadataFromDataSet(dataset?: IDataSet): Maybe<IDataSetMetadata> {
  if (!dataset) return undefined
  const sharedModelManager = getSharedModelManager(dataset)
  const sharedCaseMetadata = sharedModelManager?.getSharedModelsByType<typeof DataSetMetadata>(
    kDataSetMetadataType).find(model => model.data?.id === dataset.id)
  return sharedCaseMetadata
}
