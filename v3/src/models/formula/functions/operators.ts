import { checkDate } from '../../../utilities/date-utils'
import { checkNumber } from '../../../utilities/math-utils'
import { equal } from './function-utils'

export const operators = {
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

  add: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      const addError = new Error(`Invalid arguments for add operator: ${a}, ${b}`)

      const [isADate, aDate] = checkDate(a)
      const [isBDate, bDate] = checkDate(b)
      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)

      // both are dates
      if (isADate && isBDate) {
        throw addError
      }
      // add a number in seconds to a date
      if (isADate && isBNumber) {
        return new Date(aDate.valueOf() + bNumber * 1000)
      }
      if (isANumber && isBDate) {
        return new Date(aNumber * 1000 + bDate.valueOf())
      }

      // Numbers
      if (isANumber && isBNumber) {
        return aNumber + bNumber
      }

      // Strings
      if (typeof a === "string" || typeof b === "string") {
        // Two non-date and non-numeric strings, so concatenate them.
        return a + b
      }

      /* istanbul ignore next */
      throw addError
    }
  },

  subtract: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      const subtractError = new Error(`Invalid arguments for subtract operator: ${a}, ${b}`)

      const [isADate, aDate] = checkDate(a)
      const [isBDate, bDate] = checkDate(b)
      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)

      // Date objects
      if (isADate || isBDate) {
        // both are dates
        if (isADate && isBDate) {
          return new Date(aDate.valueOf() - bDate.valueOf())
        }
        // subtract seconds from a date
        if (isADate && isBNumber) {
          return new Date(aDate.valueOf() - bNumber * 1000)
        }
        // can't subtract a date from seconds, etc.
        throw subtractError
      }

      // Numbers
      if (isANumber && isBNumber) {
        return aNumber - bNumber
      }

      throw subtractError
    }
  }
}
