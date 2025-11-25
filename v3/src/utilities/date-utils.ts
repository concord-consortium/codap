import { fixYear, isDateString, parseDate } from "./date-parser"
import { goodTickValue, isFiniteNumber, isNumber } from "./math-utils"
import { gLocale } from "./translation/locale"
import { translate } from "./translation/translate"

export enum EDateTimeLevel {
  eSecond = 0,
  eMinute = 1,
  eHour = 2,
  eDay = 3,
  eMonth = 4,
  eYear = 5
}

// note that these strings should match the order of strings in DG.CaseTable.attributeEditor.datePrecisionOptions
export const dateUnits = ["year", "month", "day", "hour", "minute", "second", "millisecond"] as const
export type DateUnit = typeof dateUnits[number]

export function isDateUnit(value: any): value is DateUnit {
  return typeof value === "string"  && (dateUnits as readonly string[]).includes(value)
}

export const kDatePrecisionNone = ""
export const datePrecisions = [kDatePrecisionNone, ...dateUnits] as const
export type DatePrecision = typeof datePrecisions[number]

export function isDatePrecision(value: any): value is DatePrecision {
  return typeof value === "string" && (datePrecisions as readonly string[]).includes(value)
}

// Constants for converting between units of time and milliseconds
export const secondsConverter = {
  kSecond: 1000,
  kMinute: 1000 * 60,
  kHour: ((1000) * 60) * 60,
  kDay: (((1000) * 60) * 60) * 24,
  kMonth: ((((1000) * 60) * 60) * 24) * 30,
  kYear: ((((1000) * 60) * 60) * 24) * 365
}

export const unitsStringToMilliseconds = (unitString: DateUnit) => {
  switch (unitString.toLowerCase()) {
    case 'millisecond':
      return 1
    case 'second':
      return secondsConverter.kSecond
    case 'minute':
      return secondsConverter.kMinute
    case 'hour':
      return secondsConverter.kHour
    case 'day':
      return secondsConverter.kDay
    case 'month':
      return secondsConverter.kMonth
    case 'year':
      return secondsConverter.kYear
    default:
      return 0
  }

}

export const shortMonthNames = [
  'DG.Formula.DateShortMonthJanuary',
  'DG.Formula.DateShortMonthFebruary',
  'DG.Formula.DateShortMonthMarch',
  'DG.Formula.DateShortMonthApril',
  'DG.Formula.DateShortMonthMay',
  'DG.Formula.DateShortMonthJune',
  'DG.Formula.DateShortMonthJuly',
  'DG.Formula.DateShortMonthAugust',
  'DG.Formula.DateShortMonthSeptember',
  'DG.Formula.DateShortMonthOctober',
  'DG.Formula.DateShortMonthNovember',
  'DG.Formula.DateShortMonthDecember'
].map(m => { return translate(m) })

/**
 * 1. Compute the outermost date-time level that changes from the
 * minimum to the maximum date.
 * 2. The inner level is one smaller than this unless the difference of
 * the min and max outer levels is greater than some arbitrary minimum,
 * in which case the inner is the same as the outer.
 *
 * @param iMinDate { Number } milliseconds
 * @param iMaxDate { Number } milliseconds
 * @return {{outerLevel: EDateTimeLevel, innerLevel: EDateTimeLevel, increment: {Number}}}
 */
export function determineLevels(iMinDate: number, iMaxDate: number) {
  const tDateDiff = iMaxDate - iMinDate
  let tIncrement = 1 // Will only be something else if inner level is year
  let tOuterLevel
  let tInnerLevel

  if (tDateDiff < 3 * secondsConverter.kMinute) {
    tOuterLevel = EDateTimeLevel.eDay
    tInnerLevel = EDateTimeLevel.eSecond
  } else if (tDateDiff < 3 * secondsConverter.kHour) {
    tOuterLevel = EDateTimeLevel.eDay
    tInnerLevel = EDateTimeLevel.eMinute
  } else if (tDateDiff < 3 * secondsConverter.kDay) {
    tOuterLevel = EDateTimeLevel.eDay
    tInnerLevel = EDateTimeLevel.eHour
  } else if (tDateDiff < 3 * secondsConverter.kMonth) {
    tOuterLevel = EDateTimeLevel.eMonth
    tInnerLevel = EDateTimeLevel.eDay
  } else if (tDateDiff < 3 * secondsConverter.kYear) {
    tOuterLevel = EDateTimeLevel.eYear
    tInnerLevel = EDateTimeLevel.eMonth
  } else {
    tOuterLevel = EDateTimeLevel.eYear
    tInnerLevel = EDateTimeLevel.eYear
    tIncrement = Math.max(1, goodTickValue(0, tDateDiff / (secondsConverter.kYear * 5)))
  }
  return {
    increment: tIncrement,
    outerLevel: tOuterLevel,
    innerLevel: tInnerLevel
  }
}

export function mapLevelToPrecision(iLevel: EDateTimeLevel) {
  let tPrecision: DatePrecision = kDatePrecisionNone
  switch (iLevel) {
    case EDateTimeLevel.eSecond:
      tPrecision = "second"
      break
    case EDateTimeLevel.eMinute:
      tPrecision = "minute"
      break
    case EDateTimeLevel.eHour:
      tPrecision = "hour"
      break
    case EDateTimeLevel.eDay:
      tPrecision = "day"
      break
    case EDateTimeLevel.eMonth:
      tPrecision = "month"
      break
    case EDateTimeLevel.eYear:
      tPrecision = "year"
      break
  }
  return tPrecision
}

/**
  Returns true if the specified value is a DG date object.
 */
export function isDate(iValue: any): iValue is Date {
  return iValue instanceof Date
}

// returns whether the specified value is interpretable as a date, and if so its date value
export function checkDate(value: any): [false] | [true, Date] {
  if (value instanceof Date) return [true, value]
  const result = parseDate(value)
  return result ? [true, result] : [false]
}

/**
 * Default formatting for Date objects.
 * @param x
 * @param precision {number}
 * @return {string}
 */
export function formatDate(x: Date | number | string | null, precision: DatePrecision = kDatePrecisionNone):
  string | null {
  const formatPrecisions: Partial<Record<DatePrecision, Intl.DateTimeFormatOptions>> = {
    year: { year: 'numeric' },
    month: { year: 'numeric', month: 'numeric' },
    day: { year: 'numeric', month: 'numeric', day: 'numeric' },
    hour: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric' },
    minute: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' },
    second: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
      second: 'numeric' },
    millisecond: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric',
      minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions
  }

  // If precision is 'year' and  x is a string that can be converted to a number representing a year, return it.
  if (typeof x === "string") {
    const num = Number(x)
    if (isFiniteNumber(num) && Math.round(num) === num && num >= 0 && num <= 9999 && precision === 'year') {
      return x
    }
  }

  if (!(x && (isDate(x) || isDateString(x) || isFiniteNumber(x)))) {
    return null
  }

  if (isFiniteNumber(x) || isDate(x)) {
    // Note that this differs from the original implementation in V2 date_utilities.js because isFiniteNumber behaves
    // differently from DG.MathUtilities.isNumeric in V2. The original isNumeric function in V2 returns true for
    // Date objects, which was probably not planned (as `isNaN(new Date())` actually returns `false`), but is necessary
    // here. Since isFiniteNumber() is more strict, we need an explicit check for Date objects here.
    x = new Date(x.valueOf())
  } else if (isDateString(x)) {
    x = new Date(x)
  }

  // not convertible to a date
  if (typeof x === "string") return null

  // default to minutes if the value contains time information, or days if it doesn't
  let precisionFormat = formatPrecisions[precision]
  if (!precisionFormat) {
    precisionFormat = (x.getHours() > 0 || x.getMinutes() > 0)
                        ? formatPrecisions.minute
                        : formatPrecisions.day
  }

  return gLocale.formatDate(x, precisionFormat)
}

/**
 Returns true if the specified value should be treated as epoch
 seconds when provided as the only argument to the date() function,
 false if the value should be treated as a year.
 date(2000) should be treated as a year, but date(12345) should not.
 */
 export function defaultToEpochSecs(iValue: number) {
  return Math.abs(iValue) >= 5000
}

export function createDate(...args: (string | number)[]): Date | null {
  if (args.length === 0) {
    return new Date()
  }

  const yearOrSeconds = args[0] != null ? Number(args[0]) : null

  if (args.length === 1 && yearOrSeconds != null && defaultToEpochSecs(yearOrSeconds)) {
    // Only one argument and it's a number that should be treated as epoch seconds.
    // Convert from seconds to milliseconds.
    const dateFromEpoch = new Date(yearOrSeconds * 1000)
    return isNaN(dateFromEpoch.valueOf()) ? null : dateFromEpoch
  }

  let year = yearOrSeconds // at this point, yearOrSeconds is always interpreted as a year
  const monthIndex = args[1] != null ? Math.max(0, Number(args[1]) - 1) : 0
  const day = args[2] != null ? Number(args[2]) : 1
  const hours = args[3] != null ? Number(args[3]) : 0
  const minutes = args[4] != null ? Number(args[4]) : 0
  const seconds = args[5] != null ? Number(args[5]) : 0
  const milliseconds = args[6] != null ? Number(args[6]) : 0

  // Logic ported from V2 for backwards compatibility
  if (year == null) {
    year = new Date().getFullYear() // default to current year
  }
  // Apply the same interpretation of the year value  as the date parser
  // (e.g. numbers below 100 are treated as 20xx or 19xx).
  year = fixYear(year)

  const date = new Date(year, monthIndex, day, hours, minutes, seconds, milliseconds)
  return isNaN(date.valueOf()) ? null : date
}

export function convertToDate(date: any): Date | null {
  if (isDate(date)) {
    return date
  }
  if (typeof date === "string" && !isNumber(date)) {
    return parseDate(date, true)
  }
  if (isNumber(date)) {
    return createDate(Number(date))
  }
  return null
}

export function stringValuesToDateSeconds(values: string[]): number[] {
  return values.map(value => {
    const date = parseDate(value, true)
    return date ? date.getTime() / 1000 : NaN
  }).filter(isFiniteNumber)
}
