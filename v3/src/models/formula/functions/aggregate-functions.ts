import { MathNode } from "mathjs"
import { checkNumber } from "../../../utilities/math-utils"
import { IValueType } from "../../data/attribute-types"
import { CurrentScope, FValue, FValueOrArray } from "../formula-types"
import { UNDEF_RESULT, evaluateNode, getRootScope, isNumber, isValueNonEmpty, isValueTruthy } from "./function-utils"
import { FormulaMathJsScope } from "../formula-mathjs-scope"

// Almost every aggregate function can be cached in the same way.
export const cachedAggregateFnFactory =
(fnName: string, fn: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => FValueOrArray) => {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
    const cacheKey = `${fnName}(${args.toString()})-${scope.getCaseAggregateGroupId()}`
    const cachedValue = scope.getCached(cacheKey)
    if (cachedValue !== undefined) {
      return cachedValue
    }
    const result = fn(args, mathjs, currentScope)
    scope.setCached(cacheKey, result)
    return result
  }
}

// Calls the client function with a filtered array of strictly numeric values.
// Note that aggregate functions like mean, max, min, etc., all have exactly the same signature and implementation.
// The only difference is the final math operation applies to the expression results.
export const aggregateNumericFnWithFilterFactory = (fn: (values: number[]) => FValue) => {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
    const [ expression, filter ] = args
    let expressionValues = evaluateNode(expression, scope)
    if (!Array.isArray(expressionValues)) {
      expressionValues = [ expressionValues ]
    }
    let filterValues = !!filter && evaluateNode(filter, scope)
    if (!!filter && !Array.isArray(filterValues)) {
      filterValues = [ filterValues ]
    }
    expressionValues = expressionValues.filter((v: FValue, i: number) =>
      // Numeric aggregate functions should ignore non-numeric values.
      isNumber(v) && (filterValues ? isValueTruthy(filterValues[i]) : true)
    )
    return expressionValues.length > 0 ? fn(expressionValues) : UNDEF_RESULT
  }
}

// Calls the client function with a filtered array of non-empty values.
type ClientFn = (values: number[], args: MathNode[], scope: FormulaMathJsScope) => FValue
export const aggregateFnWithFilterFactory = (fn: ClientFn) => {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
    const [ expression, filter ] = args
    let expressionValues = evaluateNode(expression, scope)
    if (!Array.isArray(expressionValues)) {
      expressionValues = [ expressionValues ]
    }
    let filterValues = !!filter && evaluateNode(filter, scope)
    if (!!filter && !Array.isArray(filterValues)) {
      filterValues = [ filterValues ]
    }
    expressionValues = expressionValues.filter((v: FValue, i: number) =>
      // Numeric aggregate functions should ignore non-numeric values.
      isValueNonEmpty(v) && (filterValues ? isValueTruthy(filterValues[i]) : true)
    )
    return expressionValues.length > 0 ? fn(expressionValues, args, scope) : UNDEF_RESULT
  }
}

// Calls the client function with a filtered array of numeric/NaN values.
export const aggregateNumericOrEmptyFnWithFilterFactory = (fn: ClientFn) => {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
    const [ expression, filter ] = args
    let expressionValues = evaluateNode(expression, scope)
    if (!Array.isArray(expressionValues)) {
      expressionValues = [ expressionValues ]
    }
    let filterValues = !!filter && evaluateNode(filter, scope)
    if (!!filter && !Array.isArray(filterValues)) {
      filterValues = [ filterValues ]
    }
    // filter out values that don't pass the filter
    expressionValues = expressionValues.filter((v: FValue, i: number) =>
      filterValues ? isValueTruthy(filterValues[i]) : true
    )
    // replace non-numeric values with empty (NaN) values
    expressionValues = expressionValues.map((v: FValue, i: number) => {
      const [isValid, numValue] = checkNumber(v)
      return isValid ? numValue : NaN // indicate empty values with NaN
    })
    return expressionValues.length > 0 ? fn(expressionValues, args, scope) : UNDEF_RESULT
  }
}

// aggregate functions that don't fit neatly in the other categories
export const aggregateFunctions = {

  combine: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory((values: IValueType[]) => {
      return values.map(value => String(value)).join("")
    })
  }
}
