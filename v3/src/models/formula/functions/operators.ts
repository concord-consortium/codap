import { equal, isNumber, UNDEF_RESULT } from './function-utils'
import { parseDate } from '../../../utilities/date-parser'
import { formatDate } from '../../../utilities/date-utils'

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
      // Two numbers or numeric strings
      const isANumber = isNumber(a)
      const isBNumber = isNumber(b)
      if (isANumber && isBNumber) {
        return Number(a) + Number(b)
      }

      // Dates and numbers
      const aDate = isANumber ? null : parseDate(a, true)
      const bDate = isBNumber ? null : parseDate(b, true)
      if (aDate != null && bDate != null) {
        return formatDate(new Date(aDate.valueOf() + bDate.valueOf())) || UNDEF_RESULT
      }
      // When one of the arguments is a date and the other is a number, we assume that the number is in seconds.
      if (aDate != null && isBNumber) {
        return formatDate(new Date(aDate.valueOf() + Number(b) * 1000)) || UNDEF_RESULT
      }
      if (isANumber && bDate != null) {
        return formatDate(new Date(Number(a) * 1000 + bDate.valueOf())) || UNDEF_RESULT
      }

      // Strings
      if (typeof a === 'string' || typeof b === 'string') {
        // Two non-date and non-numeric strings, so concatenate them.
        return a + b
      }

      throw new Error(`Invalid arguments for add operator: ${a}, ${b}`)
    }
  },

  subtract: {
    isOperator: true,
    numOfRequiredArguments: 2,
    evaluateOperator: (a: any, b: any) => {
      // Two numbers or numeric strings
      const isANumber = isNumber(a)
      const isBNumber = isNumber(b)
      if (isANumber && isBNumber) {
        return Number(a) - Number(b)
      }

      // Dates and numbers
      const aDate = isANumber ? null : parseDate(a, true)
      const bDate = isBNumber ? null : parseDate(b, true)
      if (aDate != null && bDate != null) {
        return formatDate(new Date(aDate.valueOf() - bDate.valueOf())) || UNDEF_RESULT
      }
      // When one of the arguments is a date and the other is a number, we assume that the number is in seconds.
      if (aDate != null && isBNumber) {
        return formatDate(new Date(aDate.valueOf() - Number(b) * 1000)) || UNDEF_RESULT
      }
      if (isANumber && bDate != null) {
        return formatDate(new Date(Number(a) * 1000 - bDate.valueOf())) || UNDEF_RESULT
      }

      throw new Error(`Invalid arguments for subtract operator: ${a}, ${b}`)
    }
  }
}
