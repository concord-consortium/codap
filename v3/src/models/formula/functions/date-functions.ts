import { FValue } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"
import { convertToDate, createDate } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"

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
  }
}
