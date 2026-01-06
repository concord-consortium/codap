import { RequireAtLeastOne } from "type-fest"
import { IValueType } from "./attribute-types"


export interface IItemID {
  __id__: string
}
export interface ICaseID extends IItemID {
}

// a case/item is represented as an object with an __id__ and an arbitrary set of properties/values
export interface IItem extends IItemID {
  [key: string]: IValueType;
}
export interface ICase extends IItem {
}
// when creating cases, the __id__ is optional (it will be generated)
export interface ICaseCreation {
  __id__?: string;
  [key: string]: IValueType | null;
}

export type ICaseFilter = (attrId: (name: string) => string, aCase: ICase) => ICase | undefined

export interface IGetCaseOptions {
  // canonical cases have attribute ids as property keys (rather than names)
  canonical?: boolean;
  // numeric cases convert all valid numeric values to numbers
  // non-numeric cases return all property values as strings
  numeric?: boolean;
}

export interface IGetCasesOptions extends IGetCaseOptions {
  count?: number;
}
export interface IAddCasesOptions {
  // id of case before/after which to insert new cases
  // if not specified, new cases are appended
  before?: string;
  after?: string;
  // if true, property names are attribute names rather than ids
  canonicalize?: boolean;
}

export interface IMoveItemsOptions {
  // id of item before/after which to move items
  // if not specified, items are moved to end
  before?: string;
  after?: string;
}

export interface IAddAttributeOptions {
  // id of attribute before which to insert new cases
  // if not specified, new attribute is appended
  before?: string;
  // optional id of collection to which the attribute should be added
  collection?: string;
}

export interface IMoveAttributeOptions {
  before?: string;  // id of attribute before which the moved attribute should be placed
  after?: string;   // id of attribute after which the moved attribute should be placed
}

export interface IAddCollectionOptions {
  before?: string;  // id of collection before which the new collection should be placed
  after?: string;   // id of collection after which the new collection should be placed
}

export interface IMoveAttributeCollectionOptionsBase extends IMoveAttributeOptions {
  collection?: string // id of destination collection
}
export type IMoveAttributeCollectionOptions =
  RequireAtLeastOne<IMoveAttributeCollectionOptionsBase, "before" | "after" | "collection">

export interface IAttributeChangeResult {
  removedCollectionId?: string
}

// remnant of derived DataSet implementation that isn't in active use
export interface IDerivationSpec {
  attributeIDs?: string[];
  filter?: ICaseFilter;
  synchronize?: boolean;
}

// not currently used, but perhaps should be instead of __id__
// export const symId = Symbol.for("id")

// used in IGroupedCase
export const symParent = Symbol.for("parent")
export const symFirstChild = Symbol.for("firstChild")
export const symIndex = Symbol.for("index")

export interface IGroupedCase extends ICase {
  [symParent]?: string
  [symIndex]?: number
}

// represents a case in a collection which has a set of common grouped values
// and potentially a set of child cases.
export interface CaseInfo {
  // id of collection containing the group
  collectionId: string
  // object that represents the case
  groupedCase: IGroupedCase
  // ids of visible child cases in the group (if any)
  childCaseIds?: string[]
  // ids of visible leaf child items in the group
  childItemIds: string[]
  // ids of hidden leaf child items in the group
  hiddenChildItemIds: string[]
  // stringified version of grouped case values for easy comparison/categorization
  groupKey: string
  isHidden: boolean
}

export interface ItemInfo {
  index: number
  // ids of cases associated with this item from parent-most collection (0) to child-most (n-1)
  caseIds: string[]
  isHidden: boolean
}
