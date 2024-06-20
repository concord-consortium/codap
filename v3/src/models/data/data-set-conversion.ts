import { Instance, types } from "mobx-state-tree"
import { SetOptional } from "type-fest"
import { kItemIdPrefix, v3Id } from "../../utilities/codap-utils"
import { IAttributeSnapshot } from "./attribute"
import { ICollectionModelSnapshot } from "./collection"
// eslint-disable-next-line import/no-cycle
import { DataSet, IDataSet, IDataSetSnapshot } from "./data-set"

export const LegacyCaseID = types.model("CaseID", {
  __id__: types.optional(types.string, () => v3Id(kItemIdPrefix))
})
export interface ILegacyCaseID extends Instance<typeof LegacyCaseID> {}

// originally, `attributesMap` didn't exist and `attributes` was an array of attributes
interface IOriginalDataSetSnap {
  collections: Array<ICollectionModelSnapshot>
  attributes: Array<IAttributeSnapshot>
  ungrouped: Omit<ICollectionModelSnapshot, "attributes">
  cases: ILegacyCaseID[]
}
export function isOriginalDataSetSnap(snap: IDataSetSnapshot): snap is IOriginalDataSetSnap {
  return (!("attributesMap" in snap) && "attributes" in snap &&
          Array.isArray(snap.attributes) && (typeof snap.attributes[0] === "object"))
}

// temporarily, `attributesMap` existed and `attributes` was an array of references
interface ITempDataSetSnap extends Omit<IOriginalDataSetSnap, "attributes"> {
  attributesMap: Record<string, IAttributeSnapshot>
  attributes: Array<string>
}
export function isTempDataSetSnap(snap: IDataSetSnapshot): snap is ITempDataSetSnap {
  return ("attributesMap" in snap && "attributes" in snap &&
          Array.isArray(snap.attributes) && (typeof snap.attributes[0] === "string"))
}

// eventually, `attributesMap` continued to exist, `attributes` became a view, and `ungrouped` became a collection
interface IPreItemDataSetSnap extends SetOptional<ITempDataSetSnap, "attributes" | "ungrouped"> {}
export function isPreItemDataSetSnap(snap: IDataSetSnapshot): snap is IPreItemDataSetSnap {
  return !("attributes" in snap) && !("ungrouped" in snap) && ("cases" in snap)
}

export type ILegacyDataSetSnap = IOriginalDataSetSnap | ITempDataSetSnap | IPreItemDataSetSnap
export function isLegacyDataSetSnap(snap: IDataSetSnapshot): snap is ILegacyDataSetSnap {
  return isOriginalDataSetSnap(snap) || isTempDataSetSnap(snap) || isPreItemDataSetSnap(snap)
}

export function createDataSet(snap: IDataSetSnapshot | ILegacyDataSetSnap): IDataSet {
  // preProcessSnapshot handler will perform the necessary conversion internally
  return DataSet.create(snap as IDataSetSnapshot)
}
