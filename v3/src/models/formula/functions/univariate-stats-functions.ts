import { mad, MathNode, max, mean, median, min, std, sum } from "mathjs"
import { checkNumber, quantileOfSortedArray } from "../../../utilities/math-utils"
import { IValueType } from "../../data/attribute-types"
import { CurrentScope, FValue, IFormulaMathjsFunction } from "../formula-types"
import {
  aggregateFnWithFilterFactory, aggregateNumericFnWithFilterFactory, cachedAggregateFnFactory
} from "./aggregate-functions"
import { evaluateNode, getRootScope, isValueNonEmpty, isValueTruthy, UNDEF_RESULT } from "./function-utils"

interface IPercentileFunctionCache {
  values: number[]
  sorted: number[]
}

interface IRollingMeanFunctionCache {
  values: Array<{ value: number, caseId: string }>
  caseIdToIndex: Map<string, number>
}

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

  // percentile(expression, p, filterExpression)
  percentile: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    isSemiAggregate: [true, false, true],
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      const scope = getRootScope(currentScope)
      const [expressionArg, percentileArg, filterArg] = args

      const caseGroupId = scope.getCaseGroupId()
      const cacheKey = `percentile(${args.toString()})-${caseGroupId}`
      let cached = scope.getCached<IPercentileFunctionCache>(cacheKey)

      // if we don't have cached results, sort the values and cache the results
      if (!cached) {
        let values = evaluateNode(expressionArg, scope)
        if (!Array.isArray(values)) {
          values = [values]
        }
        let filterValues = !!filterArg && evaluateNode(filterArg, scope)
        if (!!filterArg && !Array.isArray(filterValues)) {
          filterValues = [filterValues]
        }
        const filteredValues: number[] = []
        const _count = values.length
        for (let i = 0; i < _count; ++i) {
          const [isValid, x] = checkNumber(values[i])
          if (isValid && (filterValues ? isValueTruthy(filterValues[i]) : true)) {
            filteredValues.push(x)
          }
        }

        cached = { values: filteredValues, sorted: filteredValues.slice().sort((a, b) => a - b) }
        scope.setCached<IPercentileFunctionCache>(cacheKey, cached)
      }

      if (!cached.values.length) return UNDEF_RESULT

      // the percentile argument is evaluated in local (not aggregate) context, so that it can vary across cases
      const [pIsValid, p] = scope.withLocalContext(() => checkNumber(evaluateNode(percentileArg, scope)))
      if (!pIsValid) return UNDEF_RESULT

      return quantileOfSortedArray(cached.sorted, p / 100) ?? UNDEF_RESULT
    }
  },

  // rollingMean(expression, width, filterExpression)
  rollingMean: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    isSemiAggregate: [true, false, true],
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      const scope = getRootScope(currentScope)
      const [expressionArg, widthArg, filterArg] = args

      const caseGroupId = scope.getCaseGroupId()
      const cacheKey = `rollingMean(${args.toString()})-${caseGroupId}`
      let cached = scope.getCached<IRollingMeanFunctionCache>(cacheKey)

      // if we don't have cached results, cache the values and their case ids
      if (!cached) {
        let values = evaluateNode(expressionArg, scope)
        if (!Array.isArray(values)) {
          values = [values]
        }
        let filterValues = !!filterArg && evaluateNode(filterArg, scope)
        if (!!filterArg && !Array.isArray(filterValues)) {
          filterValues = [filterValues]
        }
        const filteredValues: Array<{ value: number, caseId: string }> = []
        const _count = values.length
        for (let i = 0; i < _count; ++i) {
          const [isValid, x] = checkNumber(values[i])
          if (isValid && (filterValues ? isValueTruthy(filterValues[i]) : true)) {
            filteredValues.push({ value: x, caseId: scope.context.caseIds?.[i] ?? "" })
          }
        }

        const caseIdToIndex = new Map<string, number>()
        filteredValues.forEach(({ caseId }, _index) => caseIdToIndex.set(caseId, _index))

        cached = { values: filteredValues, caseIdToIndex }
        scope.setCached<IRollingMeanFunctionCache>(cacheKey, cached)
      }

      if (!cached.values.length) return UNDEF_RESULT

      // the width argument is evaluated in local (not aggregate) context, so that it can vary across cases
      const [widthIsValid, width] = scope.withLocalContext(() => checkNumber(evaluateNode(widthArg, scope)))
      if (!widthIsValid) return UNDEF_RESULT

      if (width < 1 || width > cached.values.length) return UNDEF_RESULT

      // cases that were filtered out have no rolling mean value
      const index = cached.caseIdToIndex.get(scope.caseId)
      if (index == null) return UNDEF_RESULT

      const numPreceding = Math.floor(width / 2)
      const numFollowing = width - 1 - numPreceding
      // if there are not enough preceding or following values, there is no value
      if (numPreceding > index || numFollowing >= cached.values.length - index) return UNDEF_RESULT

      let _sum = 0
      for (let i = index - numPreceding; i <= index + numFollowing; ++i) {
        _sum += cached.values[i].value
      }

      return _sum / width
    }
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
