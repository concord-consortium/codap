import { isNumeric } from "./data-utils"
import { isDateString } from "./date-parser"
import { goodTickValue } from "./math-utils"
import { getDefaultLanguage } from "./translation/translate"

export enum EDateTimeLevel {
  eSecond = 0,
  eMinute = 1,
  eHour = 2,
  eDay = 3,
  eMonth = 4,
  eYear = 5
}

export enum DatePrecision {
  None = '',
  Millisecond = 'millisecond',
  Second = 'second',
  Minute = 'minute',
  Hour = 'hour',
  Day = 'day',
  Month = 'month',
  Year = 'year'
}

export const secondsConverter = {
  kSecond: 1000,
  kMinute: 1000 * 60,
  kHour: ((1000) * 60) * 60,
  kDay: (((1000) * 60) * 60) * 24,
  kMonth: ((((1000) * 60) * 60) * 24) * 30,
  kYear: ((((1000) * 60) * 60) * 24) * 365
}

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
  let tPrecision = DatePrecision.None
  switch (iLevel) {
    case EDateTimeLevel.eSecond:
      tPrecision = DatePrecision.Second
      break
    case EDateTimeLevel.eMinute:
      tPrecision = DatePrecision.Minute
      break
    case EDateTimeLevel.eHour:
      tPrecision = DatePrecision.Hour
      break
    case EDateTimeLevel.eDay:
      tPrecision = DatePrecision.Day
      break
    case EDateTimeLevel.eMonth:
      tPrecision = DatePrecision.Month
      break
    case EDateTimeLevel.eYear:
      tPrecision = DatePrecision.Year
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

/**
 * Default formatting for Date objects.
 * @param date {Date | number | string }
 * @param precision {number}
 * @return {string}
 */
export function formatDate(x: Date | number | string, precision: DatePrecision) {
  const formatPrecisions: Record<DatePrecision, any> = {
    [DatePrecision.None]: null,
    [DatePrecision.Year]: { year: 'numeric' },
    [DatePrecision.Month]: { year: 'numeric', month: 'numeric' },
    [DatePrecision.Day]: { year: 'numeric', month: 'numeric', day: 'numeric' },
    [DatePrecision.Hour]: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric' },
    [DatePrecision.Minute]: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' },
    [DatePrecision.Second]: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
      second: 'numeric' },
    [DatePrecision.Millisecond]: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric',
      minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3 }
  }

  const precisionFormat = formatPrecisions[precision] || formatPrecisions.minute

  if (!(x && (isDate(x) || isDateString(x) || isNumeric(x)))) {
    return null
  }

  if (isNumeric(x)) {
    x = new Date(x * 1000)
  } else if (isDateString(x)) {
    x = new Date(x)
  }

  const locale = getDefaultLanguage()
  return new Intl.DateTimeFormat(locale, precisionFormat).format(x as Date)
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

/**
 Returns a DG date object constructed from its arguments.
 Currently this is a JavaScript Date object, but could be
 replaced with another (e.g. moment.js) object at some point.
 */
/*
DateUtilities.createDate = function(/!* iArgs *!/) {
  var args = [Date].concat(Array.prototype.slice.call(arguments)),
    date

  if (args.length === 2 && typeof args[1] === 'string' && isNaN(args[1])) {
    return DateUtilities.dateParser.parseDate(args[1], true)
  }

  if ((args.length === 2)) {  // We have either seconds since 1970 or a year
    if (DateUtilities.defaultToEpochSecs(args[1]))
      args[1] = Number(args[1]) * 1000// convert from seconds to milliseconds
    else {  // We have a value < 5000.
      args[2] = 0  // This will force the constructor to treat args[1] as a year
    }
  }
  // Call Date constructor with specified arguments
  // cf. http://stackoverflow.com/a/8843181
  /!* jshint -W058 *!/
  date = new (Function.bind.apply(Date, args))()

  if (isNaN(date)) {
    date = null
  }

  // replace default numeric conversion (milliseconds) with our own (seconds)
  if (date) {
    date.valueOf = function() { return Date.prototype.valueOf.apply(this) / 1000 }
  }

  return date
}
createDate = DateUtilities.createDate
*/

/**
 Default formatting for Date objects.
 Uses toLocaleDateString() for default date formatting.
 Optionally uses toLocaleTimeString() for default time formatting.
 */
/*
DateUtilities.monthName = function(x) {
  if (!(x && (isDate(x) || isDateString(x) || MathUtilities.isNumeric(x)))) return ""
  var date
  if (isDate(x))
    date = x
  else
    date = createDate(x)
  var monthNames = [
      'Formula.DateLongMonthJanuary',
      'Formula.DateLongMonthFebruary',
      'Formula.DateLongMonthMarch',
      'Formula.DateLongMonthApril',
      'Formula.DateLongMonthMay',
      'Formula.DateLongMonthJune',
      'Formula.DateLongMonthJuly',
      'Formula.DateLongMonthAugust',
      'Formula.DateLongMonthSeptember',
      'Formula.DateLongMonthOctober',
      'Formula.DateLongMonthNovember',
      'Formula.DateLongMonthDecember'
    ],
    monthName = monthNames[date.getMonth()]
  return monthName && monthName.loc()
}
monthName = DateUtilities.monthName
*/
