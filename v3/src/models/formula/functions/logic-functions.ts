import { colord, Colord } from "colord"
import { isDateString } from "../../../utilities/date-parser"
import { isDate } from "../../../utilities/date-utils"
import { hasOwnProperty } from "../../../utilities/js-utils"
import { isValueEmpty, isValueNonEmpty } from "../../../utilities/math-utils"
import { FValue, IFormulaMathjsFunction } from "../formula-types"
import { toBoolean } from "./function-utils"

export const logicFunctions: Record<string, IFormulaMathjsFunction> = {

  boolean: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => toBoolean(arg) ?? ""
  },

  isBoolean: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      if (typeof arg === "string") {
        arg = arg.toLowerCase()
      }
      const boolValues: FValue[] = [true, false, "true", "false"]
      return boolValues.indexOf(arg) >= 0
    }
  },

  isBoundary: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      return typeof arg === "object" && hasOwnProperty(arg, "jsonBoundaryObject")
    }
  },

  isColor: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      return (arg instanceof Colord || typeof arg === "string")
              ? colord(arg).isValid()
              : false
    }
  },

  isDate: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      return isDate(arg) || isDateString(arg)
    }
  },

  isFinite: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      return isValueNonEmpty(arg) && isFinite(Number(arg))
    }
  },

  isMissing: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      return isValueEmpty(arg)
    }
  },

  isNumber: {
    numOfRequiredArguments: 1,
    evaluate: (arg: FValue) => {
      return isValueNonEmpty(arg) && !isNaN(Number(arg))
    }
  }
}
