import type { ConstantNode, MathNode } from "mathjs"
import type { FormulaMathJsScope } from "./formula-mathjs-scope"

export type LookupStringConstantArg = Maybe<ConstantNode<string>>

// Used by canonicalization-utils
export type DisplayNameMap = {
  localNames: Record<string, string>
  dataSet: Record<string, {
    id: string
    attribute: Record<string, string>
  }>
}

// A map of canonical names to display names. Canonical names are unique, so simple map is enough.
export type CanonicalNameMap = Record<string, string>

export interface ILocalAttributeDependency {
  type: "localAttribute"
  attrId: string
  aggregate?: boolean
}

export interface IBoundaryDependency {
  type: "boundary"
  boundarySet: string
}

export interface IGlobalValueDependency {
  type: "globalValue"
  globalId: string
}

export interface ILookupDependency {
  type: "lookup"
  dataSetId: string
  attrId: string
  otherAttrId?: string
}

export type IFormulaDependency = ILocalAttributeDependency | IBoundaryDependency |
                                  IGlobalValueDependency | ILookupDependency

export type FValue = string | number | boolean | Date | object

export type FValueOrArray = FValue | FValue[]

export type EvaluateFunc = (...args: FValue[]) => FValue

export type EvaluateFuncWithAggregateContextSupport = (...args: (FValueOrArray)[]) => FValueOrArray

// MathJS v12.3.2 introduced the concept of PartitionedMap, replacing the previous concepts of scopes and sub-scopes.
// The parent scope is still available as the `a` property of the PartitionedMap.
// For more information, see: https://github.com/josdejong/mathjs/pull/3150
export type MathJSPartitionedMap = { a: CurrentScope, b: Map<string, any>}

export type CurrentScope = MathJSPartitionedMap | FormulaMathJsScope

export type EvaluateRawFunc = (args: MathNode[], mathjs: any, currentScope: CurrentScope) => FValueOrArray

export interface IFormulaMathjsFunction {
  // Each function needs to specify number of required arguments, so the default argument can be provided if needed.
  numOfRequiredArguments: number
  rawArgs?: boolean
  // Value of isOperator is a boolean. When true, it means that the function is an operator.
  isOperator?: boolean
  // Value of isAggregate is a boolean. When true, it means that all the arguments of the function should be resolved
  // to all cases of the attribute, not just the current case.
  isAggregate?: boolean
  // Value of isSemiAggregate is an array of booleans, where each boolean corresponds to an argument of the function.
  // When true, it means that the argument is an aggregate argument, otherwise it's not. Hence the whole function
  // is semi-aggregate.
  isSemiAggregate?: boolean[]
  // Value of isRandomFunction is a boolean. When true, it means that the function is a random function.
  // Formula needs to know whether it includes random functions, so we can enable rerandomize feature.
  isRandomFunction?: boolean
  // Self reference might be used to define a formula that calculates the cumulative value, e.g.:
  // `CumulativeValue` attribute formula: `Value + prev(CumulativeValue, 0)`
  selfReferenceAllowed?: boolean
  // `evaluate` function accepts arguments already processed and evaluated by mathjs.
  evaluate?: EvaluateFunc
  // `evaluateRaw` function accepts raw arguments following convention defined by mathjs.
  // This lets us enable custom processing of arguments, caching, etc.
  evaluateRaw?: EvaluateRawFunc
  // Custom operator overrides need to use `evaluateOperator` function instead of `evaluate` or `evaluateRaw`.
  // MathJS evaluates operators differently than functions, so we need to handle them separately.
  evaluateOperator?: EvaluateFunc
  canonicalize?: (args: MathNode[], displayNameMap: DisplayNameMap) => void
  getDependency?: (args: MathNode[]) => IFormulaDependency
  cachedEvaluateFactory?: (fnName: string, evaluate: EvaluateRawFunc) => EvaluateRawFunc
}

export type CODAPMathjsFunctionRegistry = Record<string, IFormulaMathjsFunction>
