import { create, all, MathNode } from 'mathjs'
import { FormulaMathJsScope } from '../formula-mathjs-scope'
import {
  FValue, CODAPMathjsFunctionRegistry
} from '../formula-types'
import { equal } from './function-utils'
import { arithmeticFunctions } from './arithmetic-functions'
import { lookupFunctions } from './lookup-functions'
import { otherFunctions } from './other-functions'
import { aggregateFunctions } from './aggregate-functions'
import { semiAggregateFunctions } from './semi-aggregate-functions'

export const math = create(all)

// Each aggregate function needs to be evaluated with `withAggregateContext` method.
const evaluateRawWithAggregateContext =
(fn: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => FValue | FValue[]) => {
  return (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
    // withAggregateContext returns result of the callback function
    return scope.withAggregateContext(() => fn(args, mathjs, scope))
  }
}

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
