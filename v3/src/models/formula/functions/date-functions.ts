import { FValue } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"
import { convertToDate, createDate } from "../../../utilities/date-utils"
import { parseTimeOfDay } from "../../../utilities/date-parser"
import { checkNumber } from "../../../utilities/math-utils"
import { t } from "../../../utilities/translation/translate"

// Units accepted by the optional unit argument of epochToDate and dateToEpoch, as [multiplier, divisor]
// that convert a value in the unit to milliseconds. Units smaller than a millisecond use a divisor rather
// than a fractional multiplier so that whole values convert exactly.
const kEpochUnits: Record<string, [number, number]> = {
  min: [60000, 1], minute: [60000, 1], minutes: [60000, 1],
  s: [1000, 1], sec: [1000, 1], second: [1000, 1], seconds: [1000, 1],
  ms: [1, 1], millisecond: [1, 1], milliseconds: [1, 1],
  us: [1, 1000], "μs": [1, 1000], "µs": [1, 1000],  // Greek mu and micro sign
  microsecond: [1, 1000], microseconds: [1, 1000],
  ns: [1, 1e6], nanosecond: [1, 1e6], nanoseconds: [1, 1e6]
}

// The units listed in the error message for an unrecognized unit
const kEpochUnitList = "s, min, ms, us, ns"

function getEpochUnit(functionName: string, unit: FValue): [number, number] {
  const key = String(unit).trim().toLowerCase()
  // Only own keys, so inherited names such as "constructor" and "__proto__" aren't treated as units
  if (!Object.prototype.hasOwnProperty.call(kEpochUnits, key)) {
    throw new Error(t("V3.formula.error.epochUnit", { vars: [functionName, kEpochUnitList] }))
  }
  return kEpochUnits[key]
}

export const dateFunctions = {
  date: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => createDate(...args as (string | number)[]) ?? UNDEF_RESULT
  },

  year: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => {
      const dateObject = convertToDate(date)
      return dateObject ? dateObject.getFullYear() : UNDEF_RESULT
    }
  },

  month: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => {
      const dateObject = convertToDate(date)
      // + 1 to make January 1, February 2, etc. and be backwards compatible with the V2 implementation
      return dateObject ? dateObject.getMonth() + 1 : UNDEF_RESULT
    }
  },

  monthName: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => {
      const dateObject = convertToDate(date)
      const monthNames = [
        'DG.Formula.DateLongMonthJanuary',
        'DG.Formula.DateLongMonthFebruary',
        'DG.Formula.DateLongMonthMarch',
        'DG.Formula.DateLongMonthApril',
        'DG.Formula.DateLongMonthMay',
        'DG.Formula.DateLongMonthJune',
        'DG.Formula.DateLongMonthJuly',
        'DG.Formula.DateLongMonthAugust',
        'DG.Formula.DateLongMonthSeptember',
        'DG.Formula.DateLongMonthOctober',
        'DG.Formula.DateLongMonthNovember',
        'DG.Formula.DateLongMonthDecember'
      ]
      return dateObject ? t(monthNames[dateObject.getMonth()]) : UNDEF_RESULT
    }
  },

  dayOfMonth: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => convertToDate(date)?.getDate() ?? UNDEF_RESULT
  },

  dayOfWeek: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => {
      const dateObject = convertToDate(date)
      // + 1 to make Sunday 1, Monday 2, etc. and be backwards compatible with the V2 implementation
      return dateObject ? dateObject.getDay() + 1 : UNDEF_RESULT
    }
  },

  dayOfWeekName: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => {
      const dateObject = convertToDate(date)
      const dayNames = [
        'DG.Formula.DateLongDaySunday',
        'DG.Formula.DateLongDayMonday',
        'DG.Formula.DateLongDayTuesday',
        'DG.Formula.DateLongDayWednesday',
        'DG.Formula.DateLongDayThursday',
        'DG.Formula.DateLongDayFriday',
        'DG.Formula.DateLongDaySaturday'
      ]
      return dateObject ? t(dayNames[dateObject.getDay()]) : UNDEF_RESULT
    }
  },

  hours: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => convertToDate(date)?.getHours() ?? parseTimeOfDay(date)?.hours ?? UNDEF_RESULT
  },

  minutes: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => convertToDate(date)?.getMinutes() ?? parseTimeOfDay(date)?.minutes ?? UNDEF_RESULT
  },

  seconds: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => convertToDate(date)?.getSeconds() ?? parseTimeOfDay(date)?.seconds ?? UNDEF_RESULT
  },

  today: {
    numOfRequiredArguments: 0,
    evaluate: () => {
      const now = new Date()
      // eliminate time within the day
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
  },

  now: {
    numOfRequiredArguments: 0,
    evaluate: () => new Date()
  },

  dateToEpoch: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue, unit: FValue = "s") => {
      const [multiplier, divisor] = getEpochUnit("dateToEpoch", unit)
      // NaN, Infinity and invalid dates give a blank result rather than showing NaN or Infinity
      const finiteOrUndef = (result: number) => isFinite(result) ? result : UNDEF_RESULT
      // convertToDate reads a whitespace-only string as the number 0, i.e. the year 2000
      if (typeof date === "boolean" || (typeof date === "string" && date.trim() === "")) return UNDEF_RESULT
      // A number (or numeric string) is already epoch seconds. Passing it to convertToDate would apply
      // date()'s rule that values under 5000 are years, so dateToEpoch(0) would be the year 2000.
      if (typeof date === "number" || typeof date === "string") {
        const [isNumeric, seconds] = checkNumber(date)
        if (isNumeric) {
          // Return seconds unchanged rather than converting through milliseconds, which can add rounding error
          return finiteOrUndef(multiplier === 1000 ? seconds : seconds * 1000 * divisor / multiplier)
        }
      }
      const dateObject = convertToDate(date)
      return dateObject ? finiteOrUndef(dateObject.getTime() * divisor / multiplier) : UNDEF_RESULT
    }
  },

  epochToDate: {
    numOfRequiredArguments: 1,
    evaluate: (epochTime: FValue, unit: FValue = "s") => {
      const [multiplier, divisor] = getEpochUnit("epochToDate", unit)
      // Unlike date(), small values aren't treated as years, so epochToDate(0) is January 1, 1970 UTC.
      // Only numbers and numeric strings are accepted. Booleans and Date objects are rejected because
      // Number(true) is 1 and Number(new Date()) is milliseconds, which would give misleading dates.
      if (typeof epochTime !== "number" && typeof epochTime !== "string") return UNDEF_RESULT
      const [isValid, value] = checkNumber(epochTime)
      if (!isValid) return UNDEF_RESULT
      // Date keeps only whole milliseconds and would truncate. Rounding stops float error from losing one
      // (1091312667.84 * 1000 is 1091312667839.9999) and rounds sub-millisecond units to the nearest ms.
      const date = new Date(Math.round(value * multiplier / divisor))
      return isFinite(date.valueOf()) ? date : UNDEF_RESULT
    }
  }
}
