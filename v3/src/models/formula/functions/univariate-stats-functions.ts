import { mad, MathNode, max, mean, median, min, std, sum } from "mathjs"
import { IValueType } from "../../data/attribute-types"
import { CurrentScope, FValue, IFormulaMathjsFunction } from "../formula-types"
import { evaluateNode, getRootScope, isValueNonEmpty, isValueTruthy, UNDEF_RESULT } from "./function-utils"
import {
  aggregateFnWithFilterFactory, aggregateNumericFnWithFilterFactory, cachedAggregateFnFactory
} from "./aggregate-functions"

export const univariateStatsFunctions: Record<string, IFormulaMathjsFunction> = {

  // count(expression, filterExpression)
  count: {
    numOfRequiredArguments: 0,
    isAggregate: true,
    // Note that count is an atypical aggregate function that cannot use typical caching. When count() is called without
    // arguments, the default caching method would calculate incorrect cache key. Hence, caching is implemented directly
    // in the function body.
    cachedEvaluateFactory: undefined,
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      const scope = getRootScope(currentScope)
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

  // mad(expression, filterExpression)
  mad: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(mad)
  },

  // max(expression, filterExpression)
  max: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(max)
  },

  // mean(expression, filterExpression)
  mean: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(mean)
  },

  // median(expression, filterExpression)
  median: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(median)
  },

  // min(expression, filterExpression)
  min: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(min)
  },

  // stdDev(expression, filterExpression)
  stdDev: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(std)
  },

  // stdErr(expression, filterExpression)
  stdErr: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(values => {
      return Number(std(values)) / Math.sqrt(values.length)
    })
  },

  // sum(expression, filterExpression)
  sum: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(sum)
  },

  // uniqueValues(expression, filterExpression)
  uniqueValues: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory((values: IValueType[]) => {
      const valuesSet = new Set()
      values.forEach(value => isValueNonEmpty(value) && valuesSet.add(value))
      return valuesSet.size
    })
  },

  // variance(expression, filterExpression)
  variance: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateNumericFnWithFilterFactory(values => {
      if (!values.length) return UNDEF_RESULT
      if (values.length === 1) return 0

      const count = values.length
      const _mean = mean(values)
      let sumDev = 0, sumSqrDev = 0

      // corrected two-pass algorithm from Numerical Recipes
      for (let i = 0; i < count; ++i) {
        const dev = values[i] - _mean
        sumDev += dev
        sumSqrDev += dev * dev
      }

      // second term serves as a round-off correction factor
      return ((sumSqrDev - (sumDev * sumDev) / count)) / (count - 1)
    })
  },
}
