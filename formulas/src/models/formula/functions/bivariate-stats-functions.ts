import { MathNode } from "mathjs"
import { checkNumber } from "../../../utilities/math-utils"
import {
  correlation, leastSquaresLinearRegression, linRegrIntercept, linRegrStdErrSlopeAndIntercept, linRegrSlope,
  LSRResult, rSquared, XYValues,
  ValidLSRResult,
  isValidLSRResult
} from "../../../utilities/stats-utils"
import { CurrentScope, IFormulaMathjsFunction } from "../formula-types"
import { aggregateBivariateNumericFnWithFilterFactory, cachedAggregateFnFactory } from "./aggregate-functions"
import { evaluateNode, getRootScope, isValueTruthy, UNDEF_RESULT } from "./function-utils"

export const bivariateStatsFunctions: Record<string, IFormulaMathjsFunction> = {

  correlation: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateBivariateNumericFnWithFilterFactory(xyValues => {
      return correlation(xyValues)
    })
  },

  linRegrIntercept: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateBivariateNumericFnWithFilterFactory(xyValues => {
      return linRegrIntercept(xyValues)
    })
  },

  linRegrPredicted: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    isSemiAggregate: [true, true, true],
    evaluateRaw: evaluateRawLinearRegressionSemiAggregate(({ intercept, slope }, x, y) => {
      return x * slope + intercept
    })
  },

  linRegrResidual: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    isSemiAggregate: [true, true, true],
    evaluateRaw: evaluateRawLinearRegressionSemiAggregate(({ intercept, slope }, x, y) => {
      return y - (x * slope + intercept)
    })
  },

  linRegrSEIntercept: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateBivariateNumericFnWithFilterFactory(xyValues => {
      return linRegrStdErrSlopeAndIntercept(xyValues).stdErrIntercept
    })
  },

  linRegrSESlope: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateBivariateNumericFnWithFilterFactory(xyValues => {
      return linRegrStdErrSlopeAndIntercept(xyValues).stdErrSlope
    })
  },

  linRegrSlope: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateBivariateNumericFnWithFilterFactory(xyValues => {
      return linRegrSlope(xyValues)
    })
  },

  rSquared: {
    numOfRequiredArguments: 2,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateBivariateNumericFnWithFilterFactory(xyValues => {
      return rSquared(xyValues)
    })
  }
}

// Utility function for implementing semi-aggregates that require linear regression,
// e.g. linRegrPredicted and linRegrResidual. Computes and caches the linear regression
// over the relevant cases and then passes the regression results to the provided callback
// function for computing the semi-aggregate part of the computation.
function evaluateRawLinearRegressionSemiAggregate(fn: (lsr: ValidLSRResult, x: number, y: number) => number | string) {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
    const [xArg, yArg, filterArg] = args

    const caseGroupId = scope.getCaseGroupId()
    const cacheKey = `linearRegression(${args.toString()})-${caseGroupId}`
    let lsrResult = scope.getCached<LSRResult>(cacheKey)

    // if we don't have cached results, compute the linear regression and cache the results
    if (!lsrResult) {
      let xValues = evaluateNode(xArg, scope)
      if (!Array.isArray(xValues)) {
        xValues = [xValues]
      }
      let yValues = evaluateNode(yArg, scope)
      if (!Array.isArray(yValues)) {
        yValues = [yValues]
      }
      let filterValues = !!filterArg && evaluateNode(filterArg, scope)
      if (!!filterArg && !Array.isArray(filterValues)) {
        filterValues = [filterValues]
      }
      const xyValues: XYValues = []
      const _count = Math.min(xValues.length, yValues.length)
      for (let i = 0; i < _count; ++i) {
        const [isXValid, x] = checkNumber(xValues[i])
        const [isYValid, y] = checkNumber(yValues[i])
        if (isXValid && isYValid && (filterValues ? isValueTruthy(filterValues[i]) : true)) {
          xyValues.push({ x, y })
        }
      }

      lsrResult = leastSquaresLinearRegression(xyValues)
      scope.setCached<LSRResult>(cacheKey, lsrResult)
    }

    if (!isValidLSRResult(lsrResult)) return UNDEF_RESULT

    let result: number | string = UNDEF_RESULT

    // pass the linear regression results to the local/semi-aggregate part of the computation
    scope.withLocalContext(() => {
      const [xIsValid, x] = checkNumber(evaluateNode(xArg, scope))
      const [yIsValid, y] = checkNumber(evaluateNode(yArg, scope))
      const filterValue = filterArg ? evaluateNode(filterArg, scope) : true
      if (xIsValid && yIsValid && isValueTruthy(filterValue)) {
        result = fn(lsrResult, x, y)
      }
    })

    return result
  }
}
