import { create, all, mean, median, mad, max, min, sum, random, pickRandom, MathNode, ConstantNode } from 'mathjs'
import { FormulaMathJsScope } from './formula-mathjs-scope'
import {
  DisplayNameMap, FValue, CODAPMathjsFunctionRegistry, ILookupDependency, isConstantStringNode
} from './formula-types'
import type { IDataSet } from './data-set'

export const math = create(all)

const evaluateNode = (node: MathNode, scope?: FormulaMathJsScope) => {
  return node.compile().evaluate(scope)
}

// Each aggregate function needs to be evaluated with `withAggregateContext` method.
const evaluateRawWithAggregateContext =
(fn: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => FValue | FValue[]) => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    // withAggregateContext returns result of the callback function
    return scope.withAggregateContext(() => fn(args, mathjs, scope))
  }
}

// Almost every aggregate function can be cached in the same way.
const cachedAggregateFnFactory =
(fnName: string, fn: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => FValue | FValue[]) => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    const cacheKey = `${fnName}(${args.toString()})-${scope.getCaseAggregateGroupId()}`
    const cachedValue = scope.getCached(cacheKey)
    if (cachedValue !== undefined) {
      return cachedValue
    }
    const result = fn(args, mathjs, scope)
    scope.setCached(cacheKey, result)
    return result
  }
}

// Note that aggregate functions like mean, max, min, etc., all have exactly the same signature and implementation.
// The only difference is the final math operation applies to the expression results.
const aggregateFnWithFilterFactory = (fn: (values: number[]) => number) => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    const [ expression, filter ] = args
    let expressionValues = evaluateNode(expression, scope)
    if (filter) {
      const filterValues = evaluateNode(filter, scope)
      expressionValues = expressionValues.filter((v: any, i: number) => !!filterValues[i])
    }
    return fn(expressionValues)
  }
}

// CODAP formulas assume that 0 is a truthy value, which is different from default JS behavior. So that, for instance,
// count(attribute) will return a count of valid data values, since 0 is a valid numeric value.
export const isValueTruthy = (value: any) => value !== "" && value !== false && value !== null && value !== undefined

export const equal = (a: any, b: any) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.map((v, i) => v === b[i])
  }
  if (Array.isArray(a) && !Array.isArray(b)) {
    return a.map((v) => v === b)
  }
  if (!Array.isArray(a) && Array.isArray(b)) {
    return b.map((v) => v === a)
  }
  // Checks below might seem redundant once the data set cases start using typed values, but they are not.
  // Note that user might still compare a string with a number unintentionally, and it makes sense to try to cast
  // values when possible, so that the comparison can be performed without forcing users to think about types.
  // Also, there's more ifs than needed, but it lets us avoid unnecessary casts.
  if (typeof a === "number" && typeof b !== "number") {
    return a === Number(b)
  }
  if (typeof a !== "number" && typeof b === "number") {
    return Number(a) === b
  }
  if (typeof a === "boolean" && typeof b !== "boolean") {
    return a === (b === "true")
  }
  if (typeof a !== "boolean" && typeof b === "boolean") {
    return (a === "true") === b
  }
  return a === b
}

const UNDEF_RESULT = ""

export const fnRegistry = {
  // equal(a, b) or a == b
  // Note that we need to override default MathJs implementation so we can compare strings like "ABC" == "CDE".
  // MathJs doesn't allow that by default, as it assumes that equal operator can be used only with numbers.
  equal: {
    evaluate: equal
  },

  unequal: {
    evaluate: (a: any, b: any) => !equal(a, b)
  },

  // lookupByIndex("dataSetName", "attributeName", index)
  lookupByIndex: {
    validateArguments: (args: MathNode[]): [ConstantNode<string>, ConstantNode<string>, MathNode] => {
      if (args.length !== 3) {
        throw new Error(`lookupByIndex function expects exactly 3 arguments, but it received ${args.length}`)
      }
      if (!isConstantStringNode(args[0]) || !isConstantStringNode(args[1])) {
        throw new Error("lookupByIndex function expects first two arguments to be strings " +
          "and the third one to be numeric")
      }
      return [args[0], args[1], args[2]]
    },
    getDependency: (args: MathNode[]): ILookupDependency => {
      const validArgs = fnRegistry.lookupByIndex.validateArguments(args)
      return {
        type: "lookup",
        dataSetId: validArgs[0].value,
        attrId: validArgs[1].value,
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const validArgs = fnRegistry.lookupByIndex.validateArguments(args)
      const dataSetName = validArgs[0].value
      const attrName = validArgs[1].value
      validArgs[0].value = displayNameMap.dataSet[dataSetName]?.id
      validArgs[1].value = displayNameMap.dataSet[dataSetName]?.attribute[attrName]
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const dataSetId = evaluateNode(args[0], scope)
      const attrId = evaluateNode(args[1], scope)
      const zeroBasedIndex = evaluateNode(args[2], scope) - 1
      return scope.getDataSet(dataSetId)?.getValueAtIndex(zeroBasedIndex, attrId) || UNDEF_RESULT
    }
  },

  // lookupByKey("dataSetName", "attributeName", "keyAttributeName", "keyAttributeValue" | localKeyAttribute)
  lookupByKey: {
    validateArguments: (args: MathNode[]):
      [ConstantNode<string>, ConstantNode<string>, ConstantNode<string>, MathNode] => {
      if (args.length !== 4) {
        throw new Error("lookupByKey function expects exactly 4 arguments")
      }
      if (!isConstantStringNode(args[0]) || !isConstantStringNode(args[1]) || !isConstantStringNode(args[2])) {
        throw new Error("lookupByKey function expects first three arguments to be strings")
      }
      return [args[0], args[1], args[2], args[3]]
    },
    getDependency: (args: MathNode[]): ILookupDependency => {
      const validArgs = fnRegistry.lookupByKey.validateArguments(args)
      return {
        type: "lookup",
        dataSetId: validArgs[0].value,
        attrId: validArgs[1].value,
        keyAttrId: validArgs[2].value,
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const validArgs = fnRegistry.lookupByKey.validateArguments(args)
      const dataSetName = validArgs[0].value
      const attrName = validArgs[1].value
      const keyAttrName = validArgs[2].value
      validArgs[0].value = displayNameMap.dataSet[dataSetName]?.id
      validArgs[1].value = displayNameMap.dataSet[dataSetName]?.attribute[attrName]
      validArgs[2].value = displayNameMap.dataSet[dataSetName]?.attribute[keyAttrName]
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const dataSetId = evaluateNode(args[0], scope)
      const attrId = evaluateNode(args[1], scope)
      const keyAttrId = evaluateNode(args[2], scope)
      const keyAttrValue = evaluateNode(args[3], scope)

      const dataSet: IDataSet | undefined = scope.getDataSet(dataSetId)
      if (!dataSet) {
        return UNDEF_RESULT
      }
      for (const c of dataSet.cases) {
        const val = dataSet.getValue(c.__id__, keyAttrId)
        if (equal(val, keyAttrValue)) {
          return dataSet.getValue(c.__id__, attrId) || UNDEF_RESULT
        }
      }
      return UNDEF_RESULT
    },
  },

  // mean(expression, filterExpression)
  mean: {
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(mean)
  },

  // median(expression, filterExpression)
  median: {
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(median)
  },

  // mad(expression, filterExpression)
  mad: {
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(mad)
  },

  // max(expression, filterExpression)
  max: {
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(max)
  },

  // min(expression, filterExpression)
  min: {
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(min)
  },

  // sum(expression, filterExpression)
  sum: {
    isAggregate: true,
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: aggregateFnWithFilterFactory(sum)
  },

  // count(expression, filterExpression)
  count: {
    isAggregate: true,
    // Note that count is untypical aggregate function that cannot use typical caching. When count() is called without
    // arguments, the default caching method would calculate incorrect cache key. Hence, caching is implemented directly
    // in the function body.
    cachedEvaluateFactory: undefined,
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const [ expression, filter ] = args
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

      const filterValues = filter && evaluateNode(filter, scope)
      const validExpressionValues = evaluateNode(expression, scope).filter((v: FValue, i: number) =>
        v !== "" && (filter ? isValueTruthy(filterValues[i]) : true)
      )
      const result = validExpressionValues.length

      scope.setCached(cacheKey, result)
      return result
    }
  },

  next: {
    // expression and filter are evaluated as aggregate symbols, defaultValue is not - it depends on case index
    isSemiAggregate: [true, false, true],
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      interface ICachedData {
        result?: FValue
        resultCasePointer: number
      }

      const caseGroupId = scope.getCaseGroupId()
      const cacheKey = `next(${args.toString()})-${caseGroupId}`
      const [ expression, defaultValue, filter ] = args
      const cachedData = scope.getCached(cacheKey) as ICachedData | undefined

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

  // prev(expression, defaultValue, filter)
  prev: {
    // Circular reference might be used to define a formula that calculates the cumulative value, e.g.:
    // `CumulativeValue` attribute formula: `Value + prev(CumulativeValue, 0)`
    selfReferenceAllowed: true,
    // expression and filter are evaluated as aggregate symbols, defaultValue is not - it depends on case index
    isSemiAggregate: [true, false, true],
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
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

  // if(expression, value_if_true, value_if_false)
  if: {
    evaluate: (...args: FValue[]) => args[0] ? args[1] : (args[2] ?? "")
  },

  // randomPick(...args)
  randomPick: {
    isRandomFunction: true,
    // Nothing to do here, mathjs.pickRandom() has exactly the same signature as CODAP V2 randomPick() function,
    // just the name is different.
    evaluate: (...args: FValue[]) => pickRandom(args)
  },

  // random(min, max)
  random: {
    isRandomFunction: true,
    // Nothing to do here, mathjs.random() has exactly the same signature as CODAP V2 random() function.
    evaluate: (...args: FValue[]) => random(...args as number[])
  }
}

export const typedFnRegistry: CODAPMathjsFunctionRegistry = fnRegistry

// import the new function in the Mathjs namespace
Object.keys(typedFnRegistry).forEach((key) => {
  const fn = typedFnRegistry[key]
  let evaluateRaw = fn.evaluateRaw
  if (fn.isAggregate && !fn.evaluateRaw) {
    throw new Error("Aggregate functions need to provide evaluateRaw")
  }
  if (evaluateRaw) {
    if (fn.isAggregate) {
      evaluateRaw = evaluateRawWithAggregateContext(evaluateRaw)
    }
    if (fn.cachedEvaluateFactory) {
      // Use cachedEvaluateFactory if it's defined. Currently it's defined only for aggregate functions.
      evaluateRaw = fn.cachedEvaluateFactory(key, evaluateRaw)
    }
    // MathJS expects rawArgs property to be set on the evaluate function
    (evaluateRaw as any).rawArgs = true
  }
  math.import({
    [key]: evaluateRaw || fn.evaluate
  }, {
    override: true // override functions already defined by mathjs
  })
})
