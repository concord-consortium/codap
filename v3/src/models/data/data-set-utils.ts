import { IAttribute } from "./attribute"
import { ICollectionPropsModel, isCollectionModel } from "./collection"
import { IDataSet } from "./data-set"

export function getCollectionAttrs(collection: ICollectionPropsModel, data?: IDataSet) {
  return (isCollectionModel(collection)
            ? Array.from(collection.attributes) as IAttribute[]
            : data?.ungroupedAttributes) ?? []
}
