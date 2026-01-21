import { Instance, types } from "mobx-state-tree"
import { SetOptional } from "type-fest"
import { kItemIdPrefix, v3Id } from "../../utilities/codap-utils"
import { IAttributeSnapshot } from "./attribute"
import { ICollectionModelSnapshot } from "./collection"
// eslint-disable-next-line import-x/no-cycle
import { DataSet, IDataSet, IDataSetSnapshot } from "./data-set"

export const LegacyCaseID = types.model("CaseID", {
  __id__: types.optional(types.string, () => v3Id(kItemIdPrefix))
})
export interface ILegacyCaseID extends Instance<typeof LegacyCaseID> {}

// originally, `attributesMap` didn't exist and `attributes` was an array of attributes
export interface IOriginalDataSetSnap {
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
export interface ITempDataSetSnap extends Omit<IOriginalDataSetSnap, "attributes"> {
  attributesMap: Record<string, IAttributeSnapshot>
  attributes: Array<string>
}
export function isTempDataSetSnap(snap: IDataSetSnapshot): snap is ITempDataSetSnap {
  return ("attributesMap" in snap && "attributes" in snap &&
          Array.isArray(snap.attributes) && (typeof snap.attributes[0] === "string"))
}

// eventually, `attributesMap` continued to exist, `attributes` became a view, and `ungrouped` became a collection
export interface IPreItemsDataSetSnap extends SetOptional<ITempDataSetSnap, "attributes" | "ungrouped"> {}
export function isPreItemDataSetSnap(snap: IDataSetSnapshot): snap is IPreItemsDataSetSnap {
  return !("attributes" in snap) && !("ungrouped" in snap) && ("cases" in snap)
}

// when hiddenItems were introduced, itemIds => _itemIds
export interface IInitialItemsDataSetSnap extends SetOptional<IPreItemsDataSetSnap, "cases"> {
  itemIds: string[]
}
export function isInitialItemsDataSetSnap(snap: IDataSetSnapshot): snap is IInitialItemsDataSetSnap {
  return !("attributes" in snap) && !("ungrouped" in snap) && !("cases" in snap) && ("itemIds" in snap)
}

// hiddenItemIds => setAsideItemIds
export interface IHiddenItemIdsDataSetSnap extends Omit<IInitialItemsDataSetSnap, "itemIds"> {
  hiddenItemIds?: string[]
}
export function isHiddenItemIdsDataSetSnap(snap: IDataSetSnapshot): snap is IHiddenItemIdsDataSetSnap {
  return "hiddenItemIds" in snap
}

export type ILegacyDataSetSnap = (IOriginalDataSetSnap | ITempDataSetSnap | IPreItemsDataSetSnap |
            IInitialItemsDataSetSnap | IHiddenItemIdsDataSetSnap) & { itemIds?: string[], hiddenItemIds?: string[] }
export function isLegacyDataSetSnap(snap: IDataSetSnapshot): snap is ILegacyDataSetSnap {
  return isOriginalDataSetSnap(snap) || isTempDataSetSnap(snap) || isPreItemDataSetSnap(snap) ||
          isInitialItemsDataSetSnap(snap) || isHiddenItemIdsDataSetSnap(snap)
}

export function createDataSet(snap: IDataSetSnapshot | ILegacyDataSetSnap, env?: any): IDataSet {
  // preProcessSnapshot handler will perform the necessary conversion internally
  return DataSet.create(snap as IDataSetSnapshot, env)
}
