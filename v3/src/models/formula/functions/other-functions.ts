import { pickRandom, random } from "mathjs"
import { FValue } from "../formula-types"

export const otherFunctions = {
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
