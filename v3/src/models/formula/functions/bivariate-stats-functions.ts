import {
  correlation, linRegrIntercept, linRegrStdErrSlopeAndIntercept, linRegrSlope, rSquared
} from "../../../utilities/stats-utils"
import { IFormulaMathjsFunction } from "../formula-types"
import { aggregateBivariateNumericFnWithFilterFactory, cachedAggregateFnFactory } from "./aggregate-functions"

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
