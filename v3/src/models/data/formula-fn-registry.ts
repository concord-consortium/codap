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

// Every aggregate function can be cached in the same way.
const cachedAggregateFnFactory =
(fnName: string, fn: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => FValue | FValue[]) => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    const cacheKey = `${fnName}(${args.toString()})-${scope.getCaseGroupId()}`
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


// `next` and `prev` functions can share the same implementation assuming that `next` is just reversed `prev`.
// `next` function needs to be executed for each case in the reverse order, and it'll also have different case pointer
// modifier. `prev` will set scope to the previous index (-1), while next to the next one (+1).
export const prevOrNextFactory = (variant: "next" | "prev") =>
  (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
  interface ICachedData {
    currentIndex: number
    resultIndex: number
    expressionValues: FValue[]
    filterValues: FValue[]
  }

  const cacheKey = `${variant}(${args.toString()})-${scope.getSemiAggregateGroupId()}`
  const [ expression, defaultValue, filter ] = args
  const cachedData = scope.getCached(cacheKey) as ICachedData | undefined
  let result

  if (cachedData !== undefined) {
    const { currentIndex, resultIndex, expressionValues, filterValues } = cachedData
    // This block will resolve attribute names to previous case values.
    scope.withCaseIndexModifier(() => {
      const newExpressionValue = evaluateNode(expression, scope)
      expressionValues.push(newExpressionValue)
      if (filterValues) {
        const newFilterValue = evaluateNode(filter, scope)
        filterValues.push(newFilterValue)
      }
    }, variant === "next" ? +1 : -1)
    // In case we don't find a new result index, we need to reuse the old one.
    let newResultIndex = resultIndex
    if (!filterValues || isValueTruthy(filterValues[currentIndex - 1])) {
      // If there's no filter, prev() returns the previous case value.
      // If there's filter, prev() returns the previous case value that matches the filter. Note that in the
      // previous case evaluations, we already checked all the previous indices. So, it's enough to check just
      // currentIndex - 1.
      newResultIndex = currentIndex - 1
    }
    result = expressionValues[newResultIndex]
    scope.setCached(cacheKey, {
      currentIndex: currentIndex + 1,
      resultIndex: newResultIndex,
      expressionValues,
      filterValues
    })
  } else {
    // This block of code will be executed only once for each group (if there's grouping), for the very first case.
    // The very first case can't return anything from prev() function.
    const currentIndex = 0
    result = undefined
    scope.setCached(cacheKey, {
      currentIndex: currentIndex + 1,
      resultIndex: currentIndex - 1,
      expressionValues: [],
      filterValues: filter ? [] : undefined
    })
  }
  return result ?? (defaultValue ? evaluateNode(defaultValue, scope) : UNDEF_RESULT)
}

const UNDEF_RESULT = ""

export const fnRegistry = {
  // equal(a, b) or a == b
  // Note that we need to override default MathJs implementation so we can compare strings like "ABC" == "CDE".
  // MathJs doesn't allow that by default, as it assumes that equal operator can be used only with numbers.
  equal: {
    evaluateRaw: (a: any, b: any) => {
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
        if (val === keyAttrValue) {
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
    cachedEvaluateFactory: cachedAggregateFnFactory,
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const [ expression, filter ] = args
      if (!expression) {
        // Special case - count() without arguments returns number of children cases.
        return scope.getCaseChildrenCount()
      }
      let expressionValues = evaluateNode(expression, scope)
      const filterValues = filter && evaluateNode(filter, scope)
      expressionValues = expressionValues.filter((v: any, i: number) => v !== "" && (filter ? !!filterValues[i] : true))
      return expressionValues.length
    }
  },

  next: {
    // expression and filter are evaluated as aggregate symbols, defaultValue is not - it depends on case index
    isSemiAggregate: [true, false, true],
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      // `next` is in fact a special case of `prev` function, where we iterate over cases in reverse order.
      // However, since formula manager iterates in regular order, we need to simulate reversed iteration here when
      // the first case is evaluated. Results are cached and immediately returned for all the other cases.
      const nextFn = prevOrNextFactory("next")
      const resultCacheKey = `next(${args.toString()})-RESULTS`
      type CachedResults = Record<string, FValue>
      let cachedResults = scope.getCached(resultCacheKey) as CachedResults | undefined

      if (!cachedResults) {
        cachedResults = {}
        const originalCasePointer = scope.baseCasePointer
        const originalCasePointerModifier = scope.casePointerModifier
        scope.setCasePointerModifier(0)

        scope.context.cases.forEach((c, idx) => {
          scope.setBaseCasePointer(scope.context.cases.length - 1 - idx)
          const result = nextFn(args, mathjs, scope)
          const defaultValue = args[1]
          cachedResults![scope.caseId] = result ?? (defaultValue ? evaluateNode(defaultValue, scope) : UNDEF_RESULT)
        })

        scope.setBaseCasePointer(originalCasePointer)
        scope.setCasePointerModifier(originalCasePointerModifier)
        scope.cache.set(resultCacheKey, cachedResults)
      }

      return cachedResults[scope.caseId]
    }
  },

  // prev(expression, defaultValue, filter)
  prev: {
    // Circular reference might be used to define a formula that calculates the cumulative value, e.g.:
    // `CumulativeValue` attribute formula: `Value + prev(CumulativeValue, 0)`
    selfReferenceAllowed: true,
    // expression and filter are evaluated as aggregate symbols, defaultValue is not - it depends on case index
    isSemiAggregate: [true, false, true],
    evaluateRaw: prevOrNextFactory("prev")
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
  if (evaluateRaw) {
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
