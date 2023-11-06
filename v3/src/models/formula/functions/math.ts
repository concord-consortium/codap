import { create, all, MathNode } from 'mathjs'
import { FormulaMathJsScope } from '../formula-mathjs-scope'
import { CODAPMathjsFunctionRegistry, EvaluateFunc, EvaluateRawFunc } from '../formula-types'
import { equal, evaluateNode } from './function-utils'
import { arithmeticFunctions } from './arithmetic-functions'
import { lookupFunctions } from './lookup-functions'
import { otherFunctions } from './other-functions'
import { aggregateFunctions } from './aggregate-functions'
import { semiAggregateFunctions } from './semi-aggregate-functions'

export const math = create(all)

// Each aggregate function needs to be evaluated with `withAggregateContext` method.
export const evaluateRawWithAggregateContext = (fn: EvaluateRawFunc): EvaluateRawFunc => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    // withAggregateContext returns result of the callback function
    return scope.withAggregateContext(() => fn(args, mathjs, scope))
  }
}

export const evaluateRawWithDefaultArg = (fn: EvaluateRawFunc, numOfRequiredArguments: number): EvaluateRawFunc => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    if (scope.defaultArgumentNode && args.length < numOfRequiredArguments) {
      return fn([...args, scope.defaultArgumentNode], mathjs, scope)
    }
    return fn(args, mathjs, scope)
  }
}

export const evaluateToEvaluateRaw = (fn: EvaluateFunc): EvaluateRawFunc => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    return fn(...(args.map(arg => evaluateNode(arg, scope))))
  }
}

export const fnRegistry = {
  // equal(a, b) or a == b
  // Note that we need to override default MathJs implementation so we can compare strings like "ABC" == "CDE".
  // MathJs doesn't allow that by default, as it assumes that equal operator can be used only with numbers.
  equal: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: equal
  },

  unequal: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => !equal(a, b)
  },

  ...arithmeticFunctions,

  ...lookupFunctions,

  ...otherFunctions,

  ...aggregateFunctions,

  ...semiAggregateFunctions
}

export const typedFnRegistry: CODAPMathjsFunctionRegistry = fnRegistry

// import the new function in the Mathjs namespace
Object.keys(typedFnRegistry).forEach((key) => {
  const fn = typedFnRegistry[key]
  let evaluateRaw = fn.evaluateRaw || (fn.evaluate && evaluateToEvaluateRaw(fn.evaluate))
  if (!fn.isOperator && !evaluateRaw) {
    throw new Error("evaluateRaw or evaluate function must be defined for non-operator functions")
  }
  if (evaluateRaw) {
    if (fn.isAggregate) {
      evaluateRaw = evaluateRawWithAggregateContext(evaluateRaw)
    }
    if (fn.cachedEvaluateFactory) {
      // Use cachedEvaluateFactory if it's defined. Currently it's defined only for aggregate functions.
      evaluateRaw = fn.cachedEvaluateFactory(key, evaluateRaw)
    }
    if (fn.numOfRequiredArguments > 0) {
      evaluateRaw = evaluateRawWithDefaultArg(evaluateRaw, fn.numOfRequiredArguments)
    }
    // MathJS expects rawArgs property to be set on the evaluate function
    (evaluateRaw as any).rawArgs = true
  }
  math.import({
    [key]: evaluateRaw || fn.evaluateOperator
  }, {
    override: true // override functions already defined by mathjs
  })
})
