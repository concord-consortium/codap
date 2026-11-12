import { FValue } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"
import { convertToDate, createDate } from "../../../utilities/date-utils"
import { checkNumber } from "../../../utilities/math-utils"
import { t } from "../../../utilities/translation/translate"

// Units accepted by the optional unit argument of epochToDate and dateToEpoch, as [multiplier, divisor]
// that convert a value in the unit to milliseconds. Units smaller than a millisecond use a divisor rather
// than a fractional multiplier so that whole values convert exactly.
const kEpochUnits: Record<string, [number, number]> = {
  min: [60000, 1], minutes: [60000, 1],
  s: [1000, 1], seconds: [1000, 1],
  ms: [1, 1], milliseconds: [1, 1],
  us: [1, 1000], "μs": [1, 1000], "µs": [1, 1000], microseconds: [1, 1000],  // Greek mu and micro sign
  ns: [1, 1e6], nanoseconds: [1, 1e6]
}

function getEpochUnit(unit: FValue) {
  return kEpochUnits[String(unit).trim().toLowerCase()] as [number, number] | undefined
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
    evaluate: (date: FValue) => convertToDate(date)?.getHours() ?? UNDEF_RESULT
  },

  minutes: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => convertToDate(date)?.getMinutes() ?? UNDEF_RESULT
  },

  seconds: {
    numOfRequiredArguments: 1,
    evaluate: (date: FValue) => {
      return convertToDate(date)?.getSeconds() ?? UNDEF_RESULT
    }
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
      const epochUnit = getEpochUnit(unit)
      if (!epochUnit) return UNDEF_RESULT
      const [multiplier, divisor] = epochUnit
      // convertToDate reads a whitespace-only string as the number 0, i.e. the year 2000
      if (typeof date === "boolean" || (typeof date === "string" && date.trim() === "")) return UNDEF_RESULT
      // A number (or numeric string) is already epoch seconds. Passing it to convertToDate would apply
      // date()'s rule that values under 5000 are years, so dateToEpoch(0) would be the year 2000.
      if (typeof date === "number" || typeof date === "string") {
        const [isNumeric, seconds] = checkNumber(date)
        if (isNumeric) {
          // Return seconds unchanged rather than converting through milliseconds, which can add rounding error
          return multiplier === 1000 ? seconds : seconds * 1000 * divisor / multiplier
        }
      }
      const dateObject = convertToDate(date)
      return dateObject ? dateObject.getTime() * divisor / multiplier : UNDEF_RESULT
    }
  },

  epochToDate: {
    numOfRequiredArguments: 1,
    evaluate: (epochTime: FValue, unit: FValue = "s") => {
      // Unlike date(), small values aren't treated as years, so epochToDate(0) is January 1, 1970 UTC.
      // Only numbers and numeric strings are accepted. Booleans and Date objects are rejected because
      // Number(true) is 1 and Number(new Date()) is milliseconds, which would give misleading dates.
      if (typeof epochTime !== "number" && typeof epochTime !== "string") return UNDEF_RESULT
      const epochUnit = getEpochUnit(unit)
      const [isValid, value] = checkNumber(epochTime)
      if (!isValid || !epochUnit) return UNDEF_RESULT
      const [multiplier, divisor] = epochUnit
      // Date stores whole milliseconds, so microseconds and nanoseconds are truncated to the millisecond
      const date = new Date(value * multiplier / divisor)
      return isFinite(date.valueOf()) ? date : UNDEF_RESULT
    }
  }
}
