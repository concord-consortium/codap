
import { combinations } from "mathjs"
import { FValue } from "../formula-types"
import { UNDEF_RESULT, isNumber } from "./function-utils"

// Numeric functions (like round, abs, etc.) should ignore non-numeric values. This factory is used for functions
// with multiple arguments like pow(number, power). Note that even simple functions need to handle arrays, as they can
// be used within aggregate functions.
export const numericMultiArgsFnFactory = (fn: (...values: number[]) => number, opts: { numOfRequiredArgs: number}) => {
  const { numOfRequiredArgs } = opts
  const calculateCaseValue = (args: (FValue | FValue[])[], caseIdx?: number) => {
    const caseExpressionArguments: (number | undefined)[] = []
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i]
      const argValue = caseIdx !== undefined && Array.isArray(arg) ? arg[caseIdx] : arg
      if (isNumber(argValue)) {
        caseExpressionArguments.push(Number(argValue))
      } else {
        if (i < numOfRequiredArgs) {
          // When at least one required argument is not a number, the result is undefined. No need to continue the loop.
          return UNDEF_RESULT
        } else {
          // Optional argument can be non-numeric, so we need to push undefined to the arguments array so the default
          // value is used by the original function.
          caseExpressionArguments.push(undefined)
        }
      }
    }
    // undefined values are ignored by fn, they're only allowed for optional arguments.
    return fn(...caseExpressionArguments as number[])
  }
  return (...args: (FValue | FValue[])[]) => {
    const array = args.find((a) => Array.isArray(a)) as FValue[]
    if (array) {
      // One of the arguments is an array. It means the context of the expression is aggregate function.
      // Other arguments can be arrays, but they don't have to (e.g. if user provided constants as arguments).
      return array.map((v, idx) => calculateCaseValue(args, idx))
    }
    // At this point we know that none of the arguments is an array.
    return calculateCaseValue(args, undefined)
  }
}

// Simple version of numericMultiArgsFnFactory that is used for functions with single argument, like round(number).
// It's not necessary, as numericMultiArgsFnFactory can be used for single argument functions as well, but it can be
// faster. Also, it's easier to read and can help to understand what happens in numericMultiArgsFnFactory.
export const numericFnFactory = (fn: (value: number) => number) => {
  return (expressionValue: FValue | FValue[]) => {
    if (Array.isArray(expressionValue)) {
      return expressionValue.map((v) => isNumber(v) ? fn(Number(v)) : UNDEF_RESULT)
    }
    return isNumber(expressionValue) ? fn(Number(expressionValue)) : UNDEF_RESULT
  }
}

export const arithmeticFunctions = {
  abs: {
    evaluate: numericFnFactory(Math.abs)
  },

  ceil: {
    evaluate: numericFnFactory(Math.ceil)
  },

  combinations: {
    evaluate: numericMultiArgsFnFactory(combinations, { numOfRequiredArgs: 2 })
  },

  exp: {
    evaluate: numericFnFactory(Math.exp)
  },

  floor: {
    evaluate: numericFnFactory(Math.floor)
  },

  frac: {
    evaluate: numericFnFactory((v: number) => v - Math.trunc(v))
  },

  ln: {
    evaluate: numericFnFactory(Math.log)
  },

  log: {
    evaluate: numericFnFactory(Math.log10)
  },

  pow: {
    evaluate: numericMultiArgsFnFactory(Math.pow, { numOfRequiredArgs: 2 })
  },

  round: {
    evaluate: numericMultiArgsFnFactory((num: number, digits = 0): number => {
      // It works correctly for negative digits value too.
      const factor = 10 ** digits
      return Math.round(num * factor) / factor
    }, { numOfRequiredArgs: 1 })
  },

  sqrt: {
    evaluate: numericFnFactory(Math.sqrt)
  },

  trunc: {
    evaluate: numericFnFactory(Math.trunc)
  },
}
