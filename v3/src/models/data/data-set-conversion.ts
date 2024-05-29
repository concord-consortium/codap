import { IAttributeSnapshot } from "./attribute"
import { ICollectionModelSnapshot } from "./collection"
// eslint-disable-next-line import/no-cycle
import { DataSet, IDataSetSnapshot } from "./data-set"

// originally, `attributesMap` didn't exist and `attributes` was an array of attributes
interface IOriginalDataSetSnap {
  collections: Array<ICollectionModelSnapshot>
  attributes: Array<IAttributeSnapshot>
  ungrouped: Omit<ICollectionModelSnapshot, "attributes">
}
export function isOriginalDataSetSnap(snap: IDataSetSnapshot): snap is IOriginalDataSetSnap {
  return (!("attributesMap" in snap) && "attributes" in snap &&
          Array.isArray(snap.attributes) && (typeof snap.attributes[0] === "object"))
}

// temporarily, `attributesMap` existed and `attributes` was an array of references
interface ITempDataSetSnap extends Omit<IOriginalDataSetSnap, "attributes"> {
  attributes: Array<string>
}
export function isTempDataSetSnap(snap: IDataSetSnapshot): snap is ITempDataSetSnap {
  return ("attributesMap" in snap && "attributes" in snap &&
          Array.isArray(snap.attributes) && (typeof snap.attributes[0] === "string"))
}

export function isLegacyDataSetSnap(snap: IDataSetSnapshot): snap is (IOriginalDataSetSnap | ITempDataSetSnap) {
  return isOriginalDataSetSnap(snap) || isTempDataSetSnap(snap)
}
// eventually, `attributesMap` continued to exist, `attributes` became a view, and `ungrouped` became a collection

export function createDataSet(snap: IDataSetSnapshot | IOriginalDataSetSnap) {
  // preProcessSnapshot handler will perform the necessary conversion internally
  return DataSet.create(snap as IDataSetSnapshot)
}
