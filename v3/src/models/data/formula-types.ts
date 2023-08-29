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

export type EvaluateFunc = (...args: FValue[]) => FValue | FValue[]

export type EvaluateRawFunc = (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => FValue | FValue[]

export interface IFormulaMathjsFunction {
  rawArgs?: boolean
  isAggregate?: boolean
  // Value of isSemiAggregate is an array of booleans, where each boolean corresponds to an argument of the function.
  // When true, it means that the argument is a aggregate argument, otherwise it's not. Hence the whole function
  // is semi-aggregate.
  isSemiAggregate?: boolean[]
  // `evaluate` function accepts arguments already processed and evaluated by mathjs.
  evaluate?: EvaluateFunc
  // `evaluateRaw` function accepts raw arguments following convention defined by mathjs.
  // This lets us enable custom processing of arguments, caching, etc.
  evaluateRaw?: EvaluateRawFunc
  canonicalize?: (args: MathNode[], displayNameMap: DisplayNameMap) => void
  getDependency?: (args: MathNode[]) => IFormulaDependency
  cachedEvaluateFactory?: (fnName: string, evaluate: EvaluateRawFunc) => EvaluateRawFunc
}

export type CODAPMathjsFunctionRegistry = Record<string, IFormulaMathjsFunction>
