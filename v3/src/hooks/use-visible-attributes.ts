import { IAttribute } from "../models/data/attribute"
import { useDataSet } from "./use-data-set"

export function useVisibleAttributes(collectionId?: string): IAttribute[] {
  const { data, metadata } = useDataSet()
  const collection = collectionId ? data?.getCollection(collectionId) : undefined
  return collection?.attributes.filter(attr => attr && !metadata?.isHidden(attr.id)) as IAttribute[] ?? []
}
