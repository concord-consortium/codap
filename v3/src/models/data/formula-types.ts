import { ConstantNode, MathNode, isConstantNode } from "mathjs"
import type { IGlobalValueManager } from "../global/global-value-manager"
import type { IDataSet } from "./data-set"

export const GLOBAL_VALUE = "GLOBAL_VALUE_"
export const LOCAL_ATTR = "LOCAL_ATTR_"
export const AGGREGATE_SYMBOL_SUFFIX = "_ALL"

export const isConstantStringNode = (node: MathNode): node is ConstantNode<string> =>
  isConstantNode(node) && typeof node.value === "string"

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
  keyAttrValue?: string | number
}

export type IFormulaDependency = ILocalAttributeDependency | IGlobalValueDependency | ILookupByIndexDependency |
  ILookupByKeyDependency

export interface IFormulaMathjsScope {
  caseId: string
  setCaseId(caseId: string): void
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  globalValueManager?: IGlobalValueManager
}

// For some reason, Mathjs transforms our scope into a Map, so we need to use this type sometimes
export type MathJSShallowCopyOfScope = Map<keyof IFormulaMathjsScope, any>

export interface ICODAPMathjsFunctionRegistry {
  [key: string]: {
    rawArgs: boolean
    evaluate: (args: MathNode[], mathjs: any, scope: MathJSShallowCopyOfScope) => string | number | boolean
    // Note that when canonicalizeWith option is provided, the arguments will be changed in place.
    // It might be a bit surprising, but this lets us save lots of repetitive code.
    parseArguments: (args: MathNode[], options?: { canonicalizeWith?: DisplayNameMap }) => IFormulaDependency
  }
}
