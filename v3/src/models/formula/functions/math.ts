import { create, all, MathNode } from 'mathjs'
import { FormulaMathJsScope } from '../formula-mathjs-scope'
import {
  CODAPMathjsFunctionRegistry, EvaluateFunc, EvaluateFuncWithAggregateContextSupport, EvaluateRawFunc, FValue,
  FValueOrArray
} from '../formula-types'
import { evaluateNode } from './function-utils'
import { arithmeticFunctions } from './arithmetic-functions'
import { dateFunctions } from './date-functions'
import { stringFunctions } from './string-functions'
import { lookupFunctions } from './lookup-functions'
import { otherFunctions } from './other-functions'
import { aggregateFunctions } from './aggregate-functions'
import { semiAggregateFunctions } from './semi-aggregate-functions'
import { operators } from './operators'

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

export const evaluateToEvaluateRaw = (fn: EvaluateFuncWithAggregateContextSupport): EvaluateRawFunc => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    return fn(...(args.map(arg => evaluateNode(arg, scope))))
  }
}

export const evaluateWithAggregateContextSupport = (fn: EvaluateFunc): EvaluateFuncWithAggregateContextSupport => {
  // When regular function is called in aggregate context, its arguments will be arrays. The provided function needs to
  // be called for each element of the array.
  return (...args: (FValueOrArray)[]) => {
    // Precompute the check for array arguments and their indices.
    const isArrayArg = args.map(Array.isArray)
    const firstArrayArgIdx = isArrayArg.findIndex((isArr) => isArr)
    // If no argument is an array, apply function directly.
    if (firstArrayArgIdx < 0) {
      return fn(...(args as FValue[]))
    }
    // Find the first array argument to determine the number of cases.
    const firstArrayArg = args[firstArrayArgIdx] as FValue[]
    // Map each element of the first array arg to a function call.
    return firstArrayArg.map((_, idx) => {
      const argsForCase = args.map((arg, argIdx) =>
        isArrayArg[argIdx] ? (arg as FValue[])[idx] : arg
      )
      return fn(...(argsForCase as FValue[]))
    })
  }
}

export const fnRegistry = {
  ...operators,

  ...arithmeticFunctions,

  ...dateFunctions,

  ...stringFunctions,

  ...lookupFunctions,

  ...otherFunctions,

  ...aggregateFunctions,

  ...semiAggregateFunctions
}

export const typedFnRegistry: CODAPMathjsFunctionRegistry = fnRegistry

// import the new function in the Mathjs namespace
Object.keys(typedFnRegistry).forEach((key) => {
  const fn = typedFnRegistry[key]
  let evaluateRaw = fn.evaluateRaw
  if (!evaluateRaw && fn.evaluate) {
    // Some simpler functions can be defined with evaluate function instead of evaluateRaw. In that case, we need to
    // convert evaluate function to evaluateRaw function.
    evaluateRaw = evaluateToEvaluateRaw(evaluateWithAggregateContextSupport(fn.evaluate))
  }
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
    [key]: evaluateRaw || (fn.evaluateOperator && evaluateWithAggregateContextSupport(fn.evaluateOperator))
  }, {
    override: true // override functions already defined by mathjs
  })
})
