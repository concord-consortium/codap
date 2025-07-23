import { create, all, MathNode } from "mathjs"
import {
  CODAPMathjsFunctionRegistry, CurrentScope, EvaluateFunc, EvaluateFuncWithAggregateContextSupport, EvaluateRawFunc,
  FValue, FValueOrArray,
  IFormulaMathjsFunction
} from "../formula-types"
import { aggregateFunctions } from "./aggregate-functions"
import { arithmeticFunctions } from "./arithmetic-functions"
import { bivariateStatsFunctions } from "./bivariate-stats-functions"
import { colorFunctions } from "./color-functions"
import { dateFunctions } from "./date-functions"
import { evaluateNode, getRootScope } from "./function-utils"
import { localLookupFunctions } from "./local-lookup-functions"
import { logicFunctions } from "./logic-functions"
import { lookupFunctions } from "./lookup-functions"
import { operators } from "./operators"
import { otherFunctions } from "./other-functions"
import { stringFunctions } from "./string-functions"
import { univariateStatsFunctions } from "./univariate-stats-functions"

export const math = create(all)

// Each aggregate function needs to be evaluated with `withAggregateContext` method.
export const evaluateRawWithAggregateContext = (fn: EvaluateRawFunc): EvaluateRawFunc => {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
    // withAggregateContext returns result of the callback function
    return scope.withAggregateContext(() => fn(args, mathjs, currentScope))
  }
}

export const evaluateRawWithDefaultArg = (fn: EvaluateRawFunc, numOfRequiredArguments: number): EvaluateRawFunc => {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
    if (scope.defaultArgumentNode && args.length < numOfRequiredArguments) {
      return fn([...args, scope.defaultArgumentNode], mathjs, currentScope)
    }
    return fn(args, mathjs, currentScope)
  }
}

export const evaluateToEvaluateRaw = (fn: EvaluateFuncWithAggregateContextSupport): EvaluateRawFunc => {
  return (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
    const scope = getRootScope(currentScope)
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

  ...logicFunctions,

  ...colorFunctions,

  ...dateFunctions,

  ...stringFunctions,

  ...localLookupFunctions,

  ...lookupFunctions,

  ...otherFunctions,

  ...aggregateFunctions,

  ...univariateStatsFunctions,

  ...bivariateStatsFunctions
}

export const typedFnRegistry: CODAPMathjsFunctionRegistry = fnRegistry

/**
 * Import a function into the Mathjs namespace.
 * @param key
 * @param fn
 */
const importMathjsFunction = (key: string, fn: IFormulaMathjsFunction) => {
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
}

// import all built in functions into the Mathjs namespace
Object.keys(typedFnRegistry).forEach((key) => {
  const fn = typedFnRegistry[key]
  importMathjsFunction(key, fn)
})

/**
 * Allow users of the formula system to register new functions in the Mathjs namespace. This can also be
 * used to override existing functions provided by CODAP or Mathjs.
 *
 * The registered function will also be used by by other parts of the formula system:
 * - the code editor uses it for autocompletion and highlighting.
 * - the formula dependency system uses to figure out the dependencies of the formula.
 *
 * TODO: this will not currently add documentation for the new function so it won't show up in the
 * insert function dialog of CODAP
 * @param name
 * @param fn
 */
export const registerMathjsFunction = (name: string, fn: IFormulaMathjsFunction) => {
  typedFnRegistry[name] = fn
  importMathjsFunction(name, fn)
}
