export const GLOBAL_VALUE = "GLOBAL_VALUE_"
export const LOCAL_ATTR = "LOCAL_ATTR_"
export const AGGREGATE_SYMBOL_SUFFIX = "_ALL"

export type DisplayNameMap = {
  localNames: Record<string, string>
  dataSet: Record<string, {
    id: string
    attribute: Record<string, string>
  }>
}

export interface ILocalAttributeDependency {
  type: "localAttribute"
  attrId: string
  aggregate?: boolean
}

export interface IGlobalValueDependency {
  type: "globalValue"
  globalId: string
}

export interface ILookupByIndexDependency {
  type: "lookupByIndex"
  dataSetId: string
  attrId: string
  index: number
}

export interface ILookupByKeyDependency {
  type: "lookupByKey"
  dataSetId: string
  attrId: string
  keyAttrId: string
}

export type IFormulaDependency = ILocalAttributeDependency | IGlobalValueDependency | ILookupByIndexDependency |
  ILookupByKeyDependency


export enum CODAPMathjsFunctions {
  lookupByIndex = "lookupByIndex",
  lookupByKey = "lookupByKey"
}
