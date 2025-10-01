import { pickRandom } from "mathjs"
import { Random } from "random"
import { isDateString, parseDate } from "../../../utilities/date-parser"
import { isDate } from "../../../utilities/date-utils"
import { extractNumeric, isValueEmpty } from "../../../utilities/math-utils"
import { FValue, IFormulaMathjsFunction } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"

const randomGen = new Random()

export const otherFunctions: Record<string, IFormulaMathjsFunction> = {
  // if(expression, value_if_true, value_if_false)
  if: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      const [condition, trueValue, falseValue] = args
      if (isValueEmpty(condition)) return ""
      if (condition === true || typeof condition === "string" && condition.toLowerCase() === "true") {
        return trueValue
      }
      if (condition === false || typeof condition === "string" && condition.toLowerCase() === "false") {
        return falseValue
      }
      if (typeof condition === "object") return trueValue
      return Number(condition) !== 0 ? trueValue : falseValue
    }
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
    evaluate: (...args: FValue[]) => {
      const [minOrMax, _max] = args
      let min = 0
      let max = 1
      if (_max != null) {
        min = Number(minOrMax)
        max = Number(_max)
      }
      else if (minOrMax != null) {
        max = Number(minOrMax)
      }
      return randomGen.float(min, max)
    }
  },

  // randomNormal(mean, standard_deviation) Returns a random number drawn from a normal distribution which, by default,
  // has a mean of 0 and a standard deviation of 1.
  randomNormal: {
    numOfRequiredArguments: 0,
    isRandomFunction: true,
    // We coerce the arguments to numbers.
    // randomGen.normal() has exactly the same signature as CODAP V2 randomNormal() function.
    evaluate: (...args: FValue[]) => {
      return randomGen.normal(...args.map(arg => Number(arg)))()
    }
  },

  // randomBinomial(n, p) Returns a random integer drawn from a binomial distribution with n independent draws
  // (or experiments) each with probability p of success. Defaults are n = 1, p = 0.5.
  randomBinomial: {
    numOfRequiredArguments: 0,
    isRandomFunction: true,
    // Nothing to do here, randomGen.binomial() has exactly the same signature as CODAP V2 randomBinomial() function.
    evaluate: (...args: FValue[]) => {
      return randomGen.binomial(...args.map(arg => Number(arg)))()
    }
  },

  number: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      if (isDate(arg)) {
        return arg.getTime() / 1000 // Convert to seconds
      }
      if (isDateString(arg)) {
        const time = parseDate(arg)?.getTime()
        return time != null ? time / 1000 : UNDEF_RESULT // Convert to seconds
      }
      return extractNumeric(arg) ?? UNDEF_RESULT
    }
  },

  /**
    Returns the great circle distance between the two lat/long points on the earth's surface.
    @param    {Number}  The latitude in degrees of the first point
    @param    {Number}  The longitude in degrees of the first point
    @param    {Number}  The latitude in degrees of the second point
    @param    {Number}  The longitude in degrees of the second point
    @returns  {Number}  The distance in kilometers between the two points
    */
  greatCircleDistance: {
    numOfRequiredArguments: 4,
    evaluate: (...args: FValue[]) => {
      const [_lat1, _long1, _lat2, _long2] = args
      const lat1 = extractNumeric(_lat1)
      const long1 = extractNumeric(_long1)
      const lat2 = extractNumeric(_lat2)
      const long2 = extractNumeric(_long2)
      if (lat1 != null && long1 != null && lat2 != null && long2 != null) {
        const deltaLat = lat2 - lat1
        const deltaLong = long2 - long1
        const a = Math.pow(Math.sin((Math.PI / 180) * deltaLat / 2), 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.pow(Math.sin((Math.PI / 180) * deltaLong / 2), 2)
        return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      }
      return UNDEF_RESULT
    }
  }
}
