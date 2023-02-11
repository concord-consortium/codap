import { Instance, types } from "mobx-state-tree"
import { uniqueOrderedId } from "../../utilities/js-utils"
import { IValueType } from "./attribute"
import { ICollectionModel } from "./collection"

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
  // id(s) of case(s) before which to insert new cases
  // if not specified, new cases are appended
  before?: string | string[];
  after?: string | string[];
}

export interface IMoveAttributeOptions {
  before?: string;  // id of attribute before which the moved attribute should be placed
  after?: string;   // id of attribute after which the moved attribute should be placed
}

// remnant of derived DataSet implementation that isn't in active use
export interface IDerivationSpec {
  attributeIDs?: string[];
  filter?: ICaseFilter;
  synchronize?: boolean;
}

// represents a set of cases which have common grouped values (a pseudo-case)
export interface CaseGroup {
  // id of pseudo-case and attribute values
  pseudoCase: ICase
  // ids of cases in the group
  cases: string[]
  // stringified version of grouped case values for easy comparison/categorization
  valuesJson: string
}

// represents the set of grouped cases at a particular level of the hierarchy
export interface CollectionGroup {
  collection: ICollectionModel
  groups: CaseGroup[]
  // map from valuesJson to corresponding CaseGroup
  groupsMap: Record<string, CaseGroup>
}
