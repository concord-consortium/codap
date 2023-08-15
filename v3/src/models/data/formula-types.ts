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
  // TODO: remove index from dependency! It's not necessarily a constant, it might be dynamically calculated.
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

export interface IFormulaMathjsScope {
  caseId: string
  setCaseId(caseId: string): void
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  globalValueManager?: IGlobalValueManager
}

// For some reason, Mathjs transforms our scope into a Map, so we need to use this type sometimes
export type MathJSShallowCopyOfScope = Map<keyof IFormulaMathjsScope, any>

export type EvalValue = string | number | boolean

export interface IFormulaMathjsFunction {
  rawArgs: boolean
  isAggregate: boolean
  evaluate: (args: MathNode[], mathjs: any, scope: MathJSShallowCopyOfScope) => EvalValue | EvalValue[]
  canonicalize?: (args: MathNode[], displayNameMap: DisplayNameMap) => void
  getDependency?: (args: MathNode[]) => IFormulaDependency
}

export type ICODAPMathjsFunctionRegistry = Record<string, IFormulaMathjsFunction>
