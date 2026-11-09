import { FValue } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"
import { convertToDate, createDate } from "../../../utilities/date-utils"
import { checkNumber } from "../../../utilities/math-utils"
import { t } from "../../../utilities/translation/translate"

// Units accepted by epochToDate's optional second argument, as milliseconds per unit
const kEpochUnitMilliseconds: Record<string, number> = {
  seconds: 1000, s: 1000,
  milliseconds: 1, ms: 1
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
    evaluate: (date: FValue) => {
      // convertToDate reads a whitespace-only string as the number 0, i.e. the year 2000
      if (typeof date === "boolean" || (typeof date === "string" && date.trim() === "")) return UNDEF_RESULT
      // A number (or numeric string) is already epoch seconds. Passing it to convertToDate would apply
      // date()'s rule that values under 5000 are years, so dateToEpoch(0) would be the year 2000.
      if (typeof date === "number" || typeof date === "string") {
        const [isNumeric, seconds] = checkNumber(date)
        if (isNumeric) return seconds
      }
      const dateObject = convertToDate(date)
      // CODAP stores dates as epoch seconds; Date.getTime() returns milliseconds
      return dateObject ? dateObject.getTime() / 1000 : UNDEF_RESULT
    }
  },

  epochToDate: {
    numOfRequiredArguments: 1,
    evaluate: (epochTime: FValue, unit: FValue = "seconds") => {
      // Unlike date(), small values aren't treated as years, so epochToDate(0) is January 1, 1970 UTC.
      // Only numbers and numeric strings are accepted. Booleans and Date objects are rejected because
      // Number(true) is 1 and Number(new Date()) is milliseconds, which would give misleading dates.
      if (typeof epochTime !== "number" && typeof epochTime !== "string") return UNDEF_RESULT
      const msPerUnit = kEpochUnitMilliseconds[String(unit).trim().toLowerCase()]
      const [isValid, value] = checkNumber(epochTime)
      if (!isValid || msPerUnit == null) return UNDEF_RESULT
      const date = new Date(value * msPerUnit)
      return isFinite(date.valueOf()) ? date : UNDEF_RESULT
    }
  }
}
