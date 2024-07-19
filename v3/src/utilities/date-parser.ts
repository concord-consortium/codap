import { t } from "./translation/translate"

/**
 * parseDate - Parses dates in a uniform manner across browser
 *
 * Has two modes: strict (default) and loose
 *
 * In strict mode recognizes year, month or year, month, day iso calendar date
 * or date/time strings (not just year) and local dates and date/time strings.
 * In loose mode recognizes all iso calendar dates and iso date-time strings and
 * a variety of date and date/time formats.
 *
 * Recognized in strict mode or loose mode, en/US locale:
 *   * 2019-05
 *   * 2019-05-25
 *   * 2019-05-25 10:04Z
 *   * 2019-05-25T10:04Z
 *   * 2019-05-25T10:04:03+01:00
 *   * 2019-05-25T10:04:03.123+01:00
 *   * 5/25/2019
 *   * 5/25/2019 10:04
 *   * 5/25/2019 10:04am
 *   * 5/25/2019 10:04:32.123 AM
 *
 * Recognized in loose mode
 *   * 2019
 *   * 2019.05.25
 *   * 25 Oct 2019
 *   * Oct 25, 2019
 *   * Oct. 25, 2019
 *   * October 25, 2019
 * Not recognized as dates
 *   * relative dates (e.g. today, tomorrow, next week)
 *   * anniversary dates (e.g. June 5)
 *   * out of range dates (e.g. June 32, 2019)
 */

type GroupMap = Record<string, number>

type DateSpec = {
  year: number
  month: number
  day: number
  hour: number
  min: number
  sec: number
  subsec: number
}

const timePart = '(\\d\\d?)(?::(\\d\\d?)(?::(\\d\\d)(?:\\.(\\d+))?)?)?'

const monthsFull = [
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
].map(function (m) { return t(m).toLowerCase() })

const monthsAbbr = [
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
].map(function (m) { return t(m).toLowerCase() })

const daysOfWeek = [
  "DG.Formula.DateLongDaySunday",
  "DG.Formula.DateLongDayMonday",
  "DG.Formula.DateLongDayTuesday",
  "DG.Formula.DateLongDayWednesday",
  "DG.Formula.DateLongDayThursday",
  "DG.Formula.DateLongDayFriday",
  "DG.Formula.DateLongDaySaturday",
].map(function (dow) { return t(dow).toLowerCase() })

const daysOfWeekAbbr = [
  "DG.Formula.DateShortDaySunday",
  "DG.Formula.DateShortDayMonday",
  "DG.Formula.DateShortDayTuesday",
  "DG.Formula.DateShortDayWednesday",
  "DG.Formula.DateShortDayThursday",
  "DG.Formula.DateShortDayFriday",
  "DG.Formula.DateShortDaySaturday",
].map(function (dow) { return t(dow).toLowerCase() })

const monthsProperAbbrRE = monthsAbbr.map(function (str) { return `${str  }\\.` })
const monthsProperAbbr = monthsAbbr.map(function (str) { return `${str  }.` })
// const ordinals='0th,1st,2nd,3rd,4th,5th,6th,7th,8th,9th'
const monthsArray = monthsAbbr.concat(monthsProperAbbr, monthsFull)
const monthsArrayRE = monthsAbbr.concat(monthsProperAbbrRE, monthsFull)
const daysOfWeekArray = daysOfWeek.concat(daysOfWeekAbbr)

// yyyy-MM-dd hh:mm:ss.SSSZ
const isoDateTimeRE =
  // eslint-disable-next-line max-len
  /^(\d{4})-([01]\d)(?:-([0-3]\d)(?:[T ]([0-2]\d)(?::([0-5]\d)(?::([0-5]\d)(?:[.,](\d+))?)?)?(Z|(?:[+-]\d\d:?\d\d?)| ?[a-zA-Z]{1,4}T)?)?)?$/
const isoDateTimeGroupMap = { year: 1, month: 2, day: 3, hour: 4, min: 5, sec: 6, subsec: 7, timezone: 8 }

// MM/dd/yyyy hh:mm:ss.SSS PM
// eslint-disable-next-line max-len
const localDateTimeRE = /^([01]?\d)\/([0-3]?\d)\/(\d{4}|\d{2})(?:,? (\d\d?)(?::(\d\d?)(?::(\d\d)(?:\.(\d+))?)?)?(?: ?(am|pm|AM|PM))?)?$/
const localDateTimeGroupMap = { year: 3, month: 1, day: 2, hour: 4, min: 5, sec: 6, subsec: 7, ampm: 8, timezone: 9 }

// dd MMM, yyyy or MMM, yyyy
// eslint-disable-next-line max-len
const dateVar1 = new RegExp(`^(\\d\\d?) (${  monthsArrayRE.join('|')  }),? (\\d{4})(?: ${  timePart  }(?: (am|pm))?)?$`, 'i')
const dateVar1GroupMap = { year: 3, month: 2, day: 1, hour: 4, min: 5, sec: 6, subsec: 7, ampm: 8 }

// yyyy-mm-dd, yyyy.mm.dd, yyyy/mm/dd
// Require all three parts
const dateVar2 = new RegExp(`^(\\d{4})[./-](\\d\\d?)[./-](\\d\\d?)(?: ${  timePart  }(?: (am|pm|AM|PM))?)?$`)
const dateVar2GroupMap = { year: 1, month: 2, day: 3, hour: 4, min: 5, sec: 6, subsec: 7, ampm: 8 }

// MMM dd, yyyy or MMM yyyy
// eslint-disable-next-line max-len
const dateVar3 = new RegExp(`^(?:(?:${  daysOfWeekArray.join('|')  }),? )?(${  monthsArrayRE.join('|')  })(?: (\\d\\d?),)? (\\d{4})(?: ${  timePart  }(?: (am|pm))?)?$`, 'i')
const dateVar3GroupMap = { year: 3, month: 1, day: 2, hour: 4, min: 5, sec: 6, subsec: 7, ampm: 8 }

// 'hh:mm:ss AM/PM on dd/MM/yyyy'
const dateVar4 = /(\d\d?):(\d\d)(?::(\d\d))? (AM|PM) on (\d\d?)\/(\d\d?)\/(\d{4})/
const dateVar4GroupMap = { year: 5, month: 6, day: 7, hour: 1, min: 2, sec: 3, ampm: 4 }

// unix dates: Tue Jul  9 18:16:04 PDT 2019
// eslint-disable-next-line max-len
const unixDate = new RegExp(`^(?:(?:${  daysOfWeekAbbr.join('|')  }) )?(${  monthsAbbr.join('|')  }) ([ \\d]\\d) ([ \\d]\\d):(\\d\\d):(\\d\\d) ([A-Z]{3}) (\\d{4})$`, 'i')
const unixDateGroupMap = { year: 7, month: 1, day: 2, hour: 3, min: 4, sec: 5, timezone: 6 }

// new Date().toString(), most browsers
// eslint-disable-next-line max-len
const browserDate = new RegExp(`^(?:${  daysOfWeekAbbr.join('|')  }) (${  monthsAbbr.join('|')  }) (\\d\\d?),? (\\d{4})(?: ${  timePart  } (GMT(?:[+-]\\d{4})?(?: \\([\\w ]+\\))?))`, 'i')
const browserDateGroupMap = { year: 3, month: 1, day: 2, hour: 4, min: 5, sec: 6, subsec: 7, timezone: 8 }

// eslint-disable-next-line max-len
const utcDate = new RegExp(`^(?:${  daysOfWeekAbbr.join('|')  }),? (\\d\\d?) (${  monthsAbbr.join('|')  }) (\\d{4}) ${  timePart  } GMT$`, 'i')
const utcDateGroupMap = { year: 3, month: 2, day: 1, hour: 4, min: 5, sec: 6, subsec: 7, timezone: 8 }

// yyyy
const dateVarYearOnly = /^\d{4}$/
const dateVarYearOnlyGroupMap = { year: 0 }

// MMMM dd, yyyy hh:mm:ss.SSS PM

const formatSpecs = [
  { strict: true, regex: localDateTimeRE, groupMap: localDateTimeGroupMap },
  { strict: true, regex: isoDateTimeRE, groupMap: isoDateTimeGroupMap },
  { strict: true, regex: unixDate, groupMap: unixDateGroupMap },
  { strict: true, regex: browserDate, groupMap: browserDateGroupMap },
  { strict: true, regex: utcDate, groupMap: utcDateGroupMap },
  { strict: false, regex: dateVar2, groupMap: dateVar2GroupMap },
  { strict: true, regex: dateVar1, groupMap: dateVar1GroupMap },
  { strict: true, regex: dateVar3, groupMap: dateVar3GroupMap },
  { strict: false, regex: dateVarYearOnly, groupMap: dateVarYearOnlyGroupMap },
  { strict: false, regex: dateVar4, groupMap: dateVar4GroupMap }
]

function extractDateProps(match: string[], map: GroupMap): DateSpec {
  function fixHour(hr: string, amPm?: string) {
    if (isNaN(Number(hr))) {
      return NaN
    }
    let newHr = Number(hr)
    if (amPm != null && (0 < newHr && newHr <= 12)) {
      newHr = newHr % 12
      if (amPm && amPm.toLowerCase() === 'pm') {
        newHr += 12
      }
    }
    return newHr
  }

  function fixMonth(m: string) {
    if (!isNaN(Number(m))) {
      return Number(m)
    }
    const lcMonth = m.toLowerCase()
    const monthIx = monthsArray.findIndex(function (monthName) { return monthName === lcMonth })
    return (monthIx % 12) + 1
  }

  function fixYear(y: string) {
    if (y.length === 2) {
      const yNumber = Number(y)
      if (yNumber < 49) {
        return 2000 + yNumber
      } else {
        return 1900 + yNumber
      }
    }
    else {
      return y
    }
  }

  return {
    year: Number(fixYear(match[map.year])),
    month: fixMonth(match[map.month] || '1'),
    day: Number(match[map.day] || '1'),
    hour: fixHour(match[map.hour] || '0', match[map.ampm]),
    min: Number(match[map.min] || '0'),
    sec: Number(match[map.sec] || '0'),
    subsec: Number(match[map.subsec] || '0'),
  }
}

export function isValidDateSpec(dateSpec: DateSpec) {
  const isValid =
    !isNaN(dateSpec.year) &&
    (!isNaN(dateSpec.month) && (1 <= dateSpec.month && dateSpec.month <= 12)) &&
    (!isNaN(dateSpec.day) && (1 <= dateSpec.day && dateSpec.day <= 31)) &&
    (!isNaN(dateSpec.hour) && (0 <= dateSpec.hour && dateSpec.hour <= 23)) &&
    (!isNaN(dateSpec.min) && (0 <= dateSpec.min && dateSpec.min <= 59)) &&
    (!isNaN(dateSpec.sec) && (0 <= dateSpec.sec && dateSpec.sec <= 59)) &&
    !isNaN(dateSpec.subsec)

  return isValid ? dateSpec : false
}

export function parseDate(iValue: any, iLoose?: boolean) {
  if (iValue == null) {
    return null
  }
  if (iValue instanceof Date) {
    return iValue
  }
  iValue = String(iValue)
  let match
  let dateSpec: DateSpec | false
  let groupMap: GroupMap | null = null
  let date
  const spec = formatSpecs.some(function (_spec) {
    let m
    let parsed = false
    if (_spec.strict || iLoose) {
      m = iValue.match(_spec.regex)
      if (m) {
        match = m
        groupMap = _spec.groupMap
        parsed = true
      }
    }
    return parsed
  })

  if (spec && match && groupMap) {
    dateSpec = isValidDateSpec(extractDateProps(match, groupMap))
    if (dateSpec) {
      date = new Date(dateSpec.year, (-1 + dateSpec.month), dateSpec.day,
        dateSpec.hour, dateSpec.min, dateSpec.sec, dateSpec.subsec)
      return date
    }
  }
  return null
}

/**
 * Returns true if the specified value is a string that can be converted to a
 * valid date.
 * If iLoose is true, applies a looser definition of date. For example, a four
 * digit number is interpreted as a year.
 */
export function isDateString(iValue: any, iLoose?: boolean) {
  return (typeof iValue === 'string') && !!formatSpecs.find(function (spec) {
    if (!(spec.strict || iLoose)) {
      return false
    }
    return spec.regex.test(iValue)
  })
}

