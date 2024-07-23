import { MathNode, mad, max, mean, median, min, sum } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { FValue, FValueOrArray } from "../formula-types"
import { UNDEF_RESULT, evaluateNode, isNumber, isValueTruthy } from "./function-utils"

// Almost every aggregate function can be cached in the same way.
export const cachedAggregateFnFactory =
(fnName: string, fn: (args: MathNode[], mathjs: any, partitionedMap: { a: FormulaMathJsScope }) => FValueOrArray) => {
  return (args: MathNode[], mathjs: any, partitionedMap: { a: FormulaMathJsScope }) => {
    const scope = partitionedMap.a
    const cacheKey = `${fnName}(${args.toString()})-${scope.getCaseAggregateGroupId()}`
    const cachedValue = scope.getCached(cacheKey)
    if (cachedValue !== undefined) {
      return cachedValue
    }
    const result = fn(args, mathjs, partitionedMap)
    scope.setCached(cacheKey, result)
    return result
  }
}

// Note that aggregate functions like mean, max, min, etc., all have exactly the same signature and implementation.
// The only difference is the final math operation applies to the expression results.
const aggregateFnWithFilterFactory = (fn: (values: number[]) => FValue) => {
  return (args: MathNode[], mathjs: any, partitionedMap: { a: FormulaMathJsScope }) => {
    const scope = partitionedMap.a
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

export const aggregateFunctions = {
  // mean(expression, filterExpression)
  mean: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(mean)
  },

  // median(expression, filterExpression)
  median: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(median)
  },

  // mad(expression, filterExpression)
  mad: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(mad)
  },

  // max(expression, filterExpression)
  max: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(max)
  },

  // min(expression, filterExpression)
  min: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(min)
  },

  // sum(expression, filterExpression)
  sum: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(sum)
  },

  // count(expression, filterExpression)
  count: {
    numOfRequiredArguments: 0,
    isAggregate: true,
    // Note that count is untypical aggregate function that cannot use typical caching. When count() is called without
    // arguments, the default caching method would calculate incorrect cache key. Hence, caching is implemented directly
    // in the function body.
    cachedEvaluateFactory: undefined,
    evaluateRaw: (args: MathNode[], mathjs: any, partitionedMap: { a: FormulaMathJsScope }) => {
      const scope = partitionedMap.a
      const [expression, filter] = args
      if (!expression) {
        // Special case: count() without arguments returns number of children cases. Note that this cannot be cached
        // as there is no argument and getCaseAggregateGroupId() would be calculated incorrectly. But it's not
        // a problem, as scope.getCaseChildrenCount() returns result in O(1) time anyway.
        return scope.getCaseChildrenCount()
      }

      const cacheKey = `count(${args.toString()})-${scope.getCaseAggregateGroupId()}`
      const cachedValue = scope.getCached(cacheKey)
      if (cachedValue !== undefined) {
        return cachedValue
      }

      let expressionValues = evaluateNode(expression, scope)
      if (!Array.isArray(expressionValues)) {
        expressionValues = [ expressionValues ]
      }
      let filterValues = filter && evaluateNode(filter, scope)
      if (filter && !Array.isArray(filterValues)) {
        filterValues = [ filterValues ]
      }
      const validExpressionValues = expressionValues.filter((v: FValue, i: number) =>
        isValueTruthy(v) && (filter ? isValueTruthy(filterValues[i]) : true)
      )
      const result = validExpressionValues.length

      scope.setCached(cacheKey, result)
      return result
    }
  },
}
