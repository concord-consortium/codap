
import { combinations } from "mathjs/number"
import { FValue } from "../formula-types"
import { UNDEF_RESULT, isNumber } from "./function-utils"

// Numeric functions (like round, abs, etc.) should ignore non-numeric values. This factory is used for functions
// with multiple arguments like pow(number, power). Note that even simple functions need to handle arrays, as they can
// be used within aggregate functions.
export const numericMultiArgsFnFactory = (fn: (...values: number[]) => number, opts: { numOfRequiredArgs: number}) => {
  const { numOfRequiredArgs } = opts
  return (...args: FValue[]) => {
    const caseExpressionArguments: (number | undefined)[] = []
    for (let i = 0; i < args.length; i += 1) {
      const argValue = args[i]
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
}

// Simple version of numericMultiArgsFnFactory that is used for functions with single argument, like round(number).
// It's not necessary, as numericMultiArgsFnFactory can be used for single argument functions as well, but it can be
// faster. Also, it's easier to read and can help to understand what happens in numericMultiArgsFnFactory.
export const numericFnFactory = (fn: (value: number) => number) => {
  return (expressionValue: FValue) => {
    return isNumber(expressionValue) ? fn(Number(expressionValue)) : UNDEF_RESULT
  }
}

export const arithmeticFunctions = {
  abs: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.abs)
  },

  ceil: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.ceil)
  },

  combinations: {
    numOfRequiredArguments: 2,
    evaluate: numericMultiArgsFnFactory(combinations, { numOfRequiredArgs: 2 })
  },

  exp: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.exp)
  },

  floor: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.floor)
  },

  frac: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory((v: number) => v - Math.trunc(v))
  },

  ln: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.log)
  },

  log: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.log10)
  },

  pow: {
    numOfRequiredArguments: 2,
    evaluate: numericMultiArgsFnFactory(Math.pow, { numOfRequiredArgs: 2 })
  },

  round: {
    numOfRequiredArguments: 1,
    evaluate: numericMultiArgsFnFactory((num: number, digits = 0): number => {
      // It works correctly for negative digits value too.
      const factor = 10 ** digits
      return Math.round(num * factor) / factor
    }, { numOfRequiredArgs: 1 })
  },

  sqrt: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.sqrt)
  },

  trunc: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.trunc)
  },
}
