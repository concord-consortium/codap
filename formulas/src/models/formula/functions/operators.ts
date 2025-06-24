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

  smaller: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return false
      const [isADate, aDate] = checkDate(a)
      const [isBDate, bDate] = checkDate(b)
      if (isADate) a = aDate.valueOf() / 1000
      if (isBDate) b = bDate.valueOf() / 1000
      // compare numerically if possible
      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)
      if (isANumber && isBNumber) return aNumber < bNumber
      // compare as strings
      return String(a) < String(b)
    }
  },

  smallerEq: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return false
      const [isADate, aDate] = checkDate(a)
      const [isBDate, bDate] = checkDate(b)
      if (isADate) a = aDate.valueOf() / 1000
      if (isBDate) b = bDate.valueOf() / 1000
      // compare numerically if possible
      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)
      if (isANumber && isBNumber) return aNumber <= bNumber
      // compare as strings
      return String(a) <= String(b)
    }
  },

  larger: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return false
      const [isADate, aDate] = checkDate(a)
      const [isBDate, bDate] = checkDate(b)
      if (isADate) a = aDate.valueOf() / 1000
      if (isBDate) b = bDate.valueOf() / 1000
      // compare numerically if possible
      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)
      if (isANumber && isBNumber) return aNumber > bNumber
      // compare as strings
      return String(a) > String(b)
    }
  },

  largerEq: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return false
      const [isADate, aDate] = checkDate(a)
      const [isBDate, bDate] = checkDate(b)
      if (isADate) a = aDate.valueOf() / 1000
      if (isBDate) b = bDate.valueOf() / 1000
      // compare numerically if possible
      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)
      if (isANumber && isBNumber) return aNumber >= bNumber
      // compare as strings
      return String(a) >= String(b)
    }
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

      // Empty strings
      if (a === "" || b === "") {
        return ""
      }

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
  },

  multiply: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      const multiplyError = new Error(`Invalid arguments for multiply operator: ${a}, ${b}`)

      // Empty strings
      if (a === "" || b === "") {
        return ""
      }

      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)

      if (!isANumber || !isBNumber) {
        throw multiplyError
      }

      return aNumber * bNumber
    }
  },

  divide: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      const divideError = new Error(`Invalid arguments for divide operator: ${a}, ${b}`)

      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)

      // Empty strings
      if (a === "" || b === "") {
        return ""
      }

      if (!isANumber || !isBNumber) {
        throw divideError
      }

      return aNumber / bNumber
    }
  },

  mod: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      const modError = new Error(`Invalid arguments for mod operator: ${a}, ${b}`)

      // Empty strings
      if (a === "" || b === "") {
        return ""
      }

      const [isANumber, aNumber] = checkNumber(a)
      const [isBNumber, bNumber] = checkNumber(b)

      if (!isANumber || !isBNumber) {
        throw modError
      }

      return aNumber % bNumber
    }
  }
}
