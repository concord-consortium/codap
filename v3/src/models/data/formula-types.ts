import { ConstantNode, MathNode, isConstantNode } from "mathjs"
import type { FormulaMathJsScope } from "./formula-mathjs-scope"

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

export interface ILookupDependency {
  type: "lookup"
  dataSetId: string
  attrId: string
  keyAttrId?: string
}

export type IFormulaDependency = ILocalAttributeDependency | IGlobalValueDependency | ILookupDependency

export type FValue = string | number | boolean

export type EvaluateFunc = (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => FValue | FValue[]

export interface IFormulaMathjsFunction {
  rawArgs: boolean
  isAggregate: boolean
  evaluate: EvaluateFunc
  canonicalize?: (args: MathNode[], displayNameMap: DisplayNameMap) => void
  getDependency?: (args: MathNode[]) => IFormulaDependency
  cachedEvaluateFactory?: (fnName: string, evaluate: EvaluateFunc) => EvaluateFunc
}

export type ICODAPMathjsFunctionRegistry = Record<string, IFormulaMathjsFunction>
