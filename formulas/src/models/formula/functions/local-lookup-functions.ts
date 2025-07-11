import { MathNode } from "mathjs"
import { CODAPMathjsFunctionRegistry, CurrentScope, FValue } from "../formula-types"
import { aggregateFnWithFilterFactory, cachedAggregateFnFactory } from "./aggregate-functions"
import { UNDEF_RESULT, evaluateNode, getRootScope, isValueTruthy } from "./function-utils"

export const localLookupFunctions: CODAPMathjsFunctionRegistry = {
  // first(expression, filterExpression)
  first: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(values => values[0])
  },

  // last(expression, filterExpression)
  last: {
    numOfRequiredArguments: 1,
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(values => values[values.length - 1])
  },

  // next(expression, defaultValue, filterExpression)
  next: {
    numOfRequiredArguments: 1,
    // expression and filter are evaluated as aggregate symbols, defaultValue is not - it depends on case index
    isSemiAggregate: [true, false, true],
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      interface ICachedData {
        result?: FValue
        resultCasePointer: number
      }

      const scope = getRootScope(currentScope)
      const caseGroupId = scope.getCaseGroupId()
      const cacheKey = `next(${args.toString()})-${caseGroupId}`
      const [ expression, defaultValue, filter ] = args
      const cachedData = scope.getCached<ICachedData>(cacheKey)

      let result
      let casePointer = scope.getCasePointer()
      if (!cachedData || casePointer >= cachedData.resultCasePointer) {
        // We need to look for a new next value when there's no cached data (e.g. first case being processed) or when
        // we already passed the index of cached result.
        if (filter) {
          const numOfCases = scope.getNumberOfCases()
          let expressionValue, filterValue
          let currentGroup = caseGroupId
          // Keep looking for truthy filter value as long as cases are in the same group and we didn't reach the end.
          while (!isValueTruthy(filterValue) && casePointer < numOfCases && currentGroup === caseGroupId) {
            casePointer += 1
            scope.withCustomCasePointer(() => {
              currentGroup = scope.getCaseGroupId()
              if (currentGroup === caseGroupId) {
                // It could be tempting to skip evaluation of expression if the filter is defined and evaluates to falsy
                // value. But it's not possible, as we need to evaluate each case, one by one, as there can be nested
                // `next` or `prev` calls. They rely on iterative execution for each case. In other words, we cannot
                // skip evaluation for some cases, as it would break the assumption about iterative execution.
                expressionValue = evaluateNode(expression, scope)
                filterValue = evaluateNode(filter, scope)
              } else {
                casePointer -= 1 // We reached the next group, so we need to step back and finish the loop.
              }
            }, casePointer)
          }
          result = isValueTruthy(filterValue) ? expressionValue : undefined
        } else {
          // When there's no filter, simply get the next expression value (within the same case group).
          casePointer = scope.getCasePointer() + 1
          result = scope.withCustomCasePointer(() => {
            if (scope.getCaseGroupId() === caseGroupId) {
              return evaluateNode(expression, scope)
            }
            return undefined
          }, casePointer)
        }

        scope.setCached(cacheKey, { result, resultCasePointer: casePointer })
      } else {
        // When scope.casePointer < cachedData.resultCasePointer, we can reuse the previous result.
        result = cachedData.result
      }

      return result ?? (defaultValue ? evaluateNode(defaultValue, scope) : UNDEF_RESULT)
    }
  },

  // prev(expression, defaultValue, filterExpression)
  prev: {
    numOfRequiredArguments: 1,
    // Circular reference might be used to define a formula that calculates the cumulative value, e.g.:
    // `CumulativeValue` attribute formula: `Value + prev(CumulativeValue, 0)`
    selfReferenceAllowed: true,
    // expression and filter are evaluated as aggregate symbols, defaultValue is not - it depends on case index
    isSemiAggregate: [true, false, true],
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      const scope = getRootScope(currentScope)
      const [ expression, defaultValue, filter ] = args

      const caseGroupId = scope.getCaseGroupId()
      const cacheKey = `prev(${args.toString()})-${caseGroupId}`
      const cachedResult = scope.getCached(cacheKey) as FValue | undefined

      let newExpressionValue, newFilterValue
      scope.withCustomCasePointer(() => {
        // It could be tempting to skip evaluation of expression if the filter is defined and evaluates to falsy
        // value. But it's not possible, as we need to evaluate each case, one by one, as there can be nested `next`
        // or `prev` calls. They rely on iterative execution for each case. In other words, we cannot skip evaluation
        // for some cases, as it would break the assumption about iterative execution.
        if (scope.getCaseGroupId() === caseGroupId) {
          newExpressionValue = evaluateNode(expression, scope)
          if (filter) {
            newFilterValue = evaluateNode(filter, scope)
          }
        }
      }, scope.getCasePointer() - 1)
      // If there's no filter or filter value is truthy, prev() result is updated to the previous case value.
      const result = !filter || isValueTruthy(newFilterValue) ? newExpressionValue : cachedResult

      scope.setCached(cacheKey, result)
      return result ?? (defaultValue ? evaluateNode(defaultValue, scope) : UNDEF_RESULT)
    }
  },
}
