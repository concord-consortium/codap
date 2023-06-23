import { IAttribute } from "./attribute"
import { ICollectionPropsModel, isCollectionModel } from "./collection"
import { IDataSet } from "./data-set"

export function getCollectionAttrs(collection: ICollectionPropsModel, data?: IDataSet) {
  return (isCollectionModel(collection)
            ? Array.from(collection.attributes) as IAttribute[]
            : data?.ungroupedAttributes) ?? []
}

export function collectionCaseIdFromIndex(index: number, data?: IDataSet, collectionId?: string) {
  if (!data) return undefined
  const cases = data.getCasesForCollection(collectionId)
  return cases[index]?.__id__
}

export function collectionCaseIndexFromId(caseId: string, data?: IDataSet, collectionId?: string) {
  if (!data) return undefined
  const cases = data.getCasesForCollection(collectionId)
  // for now, linear search through pseudo-cases; could index if performance becomes a problem.
  const found = cases.findIndex(aCase => aCase.__id__ === caseId)
  return found >= 0 ? found : undefined
}
