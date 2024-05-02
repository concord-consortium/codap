import { Instance, types } from "mobx-state-tree"
import { uniqueOrderedId } from "../../utilities/js-utils"
import { IValueType } from "./attribute"

export const uniqueCaseId = () => `CASE${uniqueOrderedId()}`

export const CaseID = types.model("CaseID", {
  __id__: types.optional(types.identifier, () => uniqueCaseId())
})
export interface ICaseID extends Instance<typeof CaseID> {}

// a case is represented as an object with an __id__ and an arbitrary set of properties/values
export interface ICase {
  __id__: string;
  [key: string]: IValueType;
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
export interface IAddCaseOptions {
  // id of case before/after which to insert new cases
  // if not specified, new cases are appended
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
  withoutCustomUndo?: boolean;
}

export interface IMoveAttributeCollectionOptions extends IMoveAttributeOptions {
  collection?: string // id of destination collection; undefined => no collection (ungrouped)
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

// represents a set of cases which have common grouped values (a pseudo-case)
export interface CaseGroup {
  // id of collection containing the group
  collectionId: string
  // id of pseudo-case and attribute values
  pseudoCase: IGroupedCase
  // ids of leaf child cases (actual cases) in the group
  childCaseIds: string[]
  // ids of child pseudo cases in the group (if any)
  childPseudoCaseIds?: string[]
  // stringified version of grouped case values for easy comparison/categorization
  valuesJson: string
}
