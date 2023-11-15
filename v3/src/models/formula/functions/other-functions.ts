import { pickRandom, random } from "mathjs"
import { FValue } from "../formula-types"

// Numeric functions (like round, abs, etc.) should ignore non-numeric values. This factory is used for functions
// with multiple arguments like pow(number, power). Note that even simple functions need to handle arrays, as they can
// be used within aggregate functions.
export const multiArgsFnFactory = (fn: (...values: FValue[]) => FValue) => {
  const calculateCaseValue = (args: (FValue | FValue[])[], caseIdx?: number) => {
    const caseExpressionArguments: (FValue | undefined)[] = []
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i]
      const argValue = caseIdx !== undefined && Array.isArray(arg) ? arg[caseIdx] : arg
      caseExpressionArguments.push(argValue as FValue)
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

export const otherFunctions = {
  // if(expression, value_if_true, value_if_false)
  if: {
    numOfRequiredArguments: 3,
    evaluate: multiArgsFnFactory((...args: FValue[]) => args[0] ? args[1] : (args[2] ?? ""))
  },

  // randomPick(...args)
  randomPick: {
    numOfRequiredArguments: 1,
    isRandomFunction: true,
    // Nothing to do here, mathjs.pickRandom() has exactly the same signature as CODAP V2 randomPick() function,
    // just the name is different.
    evaluate: (...args: FValue[]) => pickRandom(args)
  },

  // random(min, max)
  random: {
    numOfRequiredArguments: 0,
    isRandomFunction: true,
    // Nothing to do here, mathjs.random() has exactly the same signature as CODAP V2 random() function.
    evaluate: (...args: FValue[]) => random(...args as number[])
  }
}
