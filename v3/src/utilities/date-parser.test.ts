import { fixYear, isDateString, isValidDateSpec, parseDate } from './date-parser'

describe('Date Parser tests - V2 compatibility', () => {
  // These tests are ported from V2 and should always pass unchanged as long as we want to maintain compatibility.
  test('local date format', () => {
    expect(parseDate('11/9/2016', true)?.toISOString()).toBe(new Date(2016, 10, 9).toISOString())
    expect(parseDate('11/09/2016', true)?.toISOString()).toBe(new Date(2016, 10, 9).toISOString())
    expect(parseDate('4/1/1928', true)?.toISOString()).toBe(new Date(1928, 3, 1).toISOString())
    expect(parseDate('11/9/16', true)?.toISOString()).toBe(new Date(2016, 10, 9).toISOString())
    expect(parseDate('11/09/16', true)?.toISOString()).toBe(new Date(2016, 10, 9).toISOString())
    expect(parseDate('04/1/28', true)?.toISOString()).toBe(new Date(2028, 3, 1).toISOString())
    // 3 digit year was not supported in V2
    expect(parseDate('11/9/153', true)?.toISOString()).toBe(new Date(153, 10, 9).toISOString())
  })
  test('ISO dates', () => {
    expect(parseDate('2016-01', true)?.toISOString()).toBe(new Date(2016, 0, 1).toISOString())
    expect(parseDate('2016-02-02', true)?.toISOString()).toBe(new Date(2016, 1, 2).toISOString())
    // 3 digit year was not supported in V2
    expect(parseDate('153-11-9', true)?.toISOString()).toBe(new Date(153, 10, 9).toISOString())
  })
  test('day, month name, year dates', () => {
    expect(parseDate('03 Mar 2016', true)?.toISOString()).toBe(new Date(2016, 2, 3).toISOString())
    // 3 digit year was not supported in V2
    expect(parseDate('09 Nov 153', true)?.toISOString()).toBe(new Date(153, 10, 9).toISOString())
  })
  test('traditional US dates', () => {
    expect(parseDate('April 4, 2016', true)?.toISOString()).toBe(new Date(2016, 3, 4).toISOString())
    expect(parseDate('Apr 5, 2016', true)?.toISOString()).toBe(new Date(2016, 3, 5).toISOString())
    expect(parseDate('Monday, May 5, 2016', true)?.toISOString()).toBe(new Date(2016, 4, 5).toISOString())
    // 3 digit year was not supported in V2
    expect(parseDate('Monday, Nov 9 153', true)?.toISOString()).toBe(new Date(153, 10, 9).toISOString())
  })
  test('year.month.day dates', () => {
    expect(parseDate('2016.6.6', true)?.toISOString()).toBe(new Date(2016, 5, 6).toISOString())
    // 3 digit year was not supported in V2
    expect(parseDate('153.11.9', true)?.toISOString()).toBe(new Date(153, 10, 9).toISOString())
  })
  test('unix dates', () => {
    expect(parseDate('Thu Jul 11 09:12:47 PDT 2019', true)?.toISOString())
      .toBe(new Date(2019, 6, 11, 9, 12, 47).toISOString())
  })
  test('UTC dates', () => {
    expect(parseDate('Thu, 11 Jul 2019 16:17:01 GMT', true)?.toISOString())
      .toBe(new Date(2019, 6, 11, 16, 17, 1).toISOString())
  })
  test('ISO Date/time', () => {
    expect(parseDate('2019-07-11T16:20:38.575Z', true)?.toISOString())
      .toBe(new Date(2019, 6, 11, 16, 20, 38, 575).toISOString())
  })
  test('dates with times', () => {
    expect(parseDate('11/9/2016 7:18', true)?.toISOString()).toBe(new Date(2016, 10, 9, 7, 18).toISOString())
    expect(parseDate('11/9/2016 7:18am', true)?.toISOString()).toBe(new Date(2016, 10, 9, 7, 18).toISOString())
    expect(parseDate('11/9/2016 7:18 am', true)?.toISOString()).toBe(new Date(2016, 10, 9, 7, 18).toISOString())
    expect(parseDate('11/9/2016 7:18AM', true)?.toISOString()).toBe(new Date(2016, 10, 9, 7, 18).toISOString())
    expect(parseDate('11/9/2016 7:18:02', true)?.toISOString()).toBe(new Date(2016, 10, 9, 7, 18, 2).toISOString())
    expect(parseDate('11/9/2016 7:18:02 AM', true)?.toISOString()).toBe(new Date(2016, 10, 9, 7, 18, 2).toISOString())
    expect(parseDate('11/9/2016 7:18:02PM', true)?.toISOString()).toBe(new Date(2016, 10, 9, 19, 18, 2).toISOString())
    expect(parseDate('11/9/2016 7:18:02.123', true)?.toISOString())
      .toBe(new Date(2016, 10, 9, 7, 18, 2, 123).toISOString())
    expect(parseDate('11/9/2016 7:18:02.234 pm', true)?.toISOString())
      .toBe(new Date(2016, 10, 9, 19, 18, 2, 234).toISOString())
    expect(parseDate('11/9/2016 7:18:02.234am', true)?.toISOString())
      .toBe(new Date(2016, 10, 9, 7, 18, 2, 234).toISOString())
    expect(parseDate('11/9/2016 17:18:02', true)?.toISOString())
      .toBe(new Date(2016, 10, 9, 17, 18, 2).toISOString())
    expect(parseDate('11/9/2016 17:18:02.123', true)?.toISOString())
      .toBe(new Date(2016, 10, 9, 17, 18, 2, 123).toISOString())

    // 3 digit year was not supported in V2
    expect(parseDate('11/9/153 7:18', true)?.toISOString()).toBe(new Date(153, 10, 9, 7, 18).toISOString())
    expect(parseDate('11/9/153 7:18:02', true)?.toISOString()).toBe(new Date(153, 10, 9, 7, 18, 2).toISOString())
    expect(parseDate('11/9/153 7:18:02.123', true)?.toISOString())
      .toBe(new Date(153, 10, 9, 7, 18, 2, 123).toISOString())
  })
  test('ISO 8601', () => {
    expect(isDateString('2016-11-10')).toBe(true)
    expect(isDateString('2016-11-09T07:18:02')).toBe(true)
    expect(isDateString('2016-11-09T07:18:02-07:00')).toBe(true)
    expect(isDateString('2016-11-09T07:18:02+0700')).toBe(true)
    expect(isDateString('2016-11-10T21:27:42Z')).toBe(true)
    expect(isDateString('2016-11-09T07:18:02.123')).toBe(true)
    expect(isDateString('2016-11-09T07:18:02.123+07:00')).toBe(true)
    expect(isDateString('2016-11-09T07:18:02.123-0700')).toBe(true)
    expect(isDateString('2016-11-10T21:27:42.123Z')).toBe(true)
    expect(isDateString('September 1, 2016')).toBe(true)
    expect(isDateString('2016-11-10T21:27:42.12Z')).toBe(true)
    // 3 digit year was not supported in V2
    expect(isDateString('153', true)).toBe(true)
    expect(isDateString('153-11-9', true)).toBe(true)
    expect(isDateString('September 1, 153', true)).toBe(true)
  })
  test('invalid strings', () => {
    expect(isDateString('')).toBe(false)
    expect(isDateString('a')).toBe(false)
    expect(isDateString('123')).toBe(false)
    expect(isDateString('123%')).toBe(false)
    expect(isDateString('//')).toBe(false)
    expect(isDateString(':')).toBe(false)
    expect(isDateString('::')).toBe(false)
    // Likely meant to be dates, but not recognized, yet.
    expect(isDateString('11/ 9/2016')).toBe(false)
    expect(isDateString('12/31')).toBe(false)
    expect(isDateString('1/2')).toBe(false)
    expect(isDateString('2016-1-10T21:27:42.123Z')).toBe(false)
    expect(isDateString('2016-1-10T21:7:42.123Z')).toBe(false)
    expect(isDateString('2016-1-10T1:07:42.123Z')).toBe(false)
  })
})

describe('isValidDateSpec', () => {
  test('returns dateSpec when all values are valid', () => {
    const validDateSpec = {
      year: 2023,
      month: 7,
      day: 17,
      hour: 15,
      min: 30,
      sec: 45,
      subsec: 123
    }
    expect(isValidDateSpec(validDateSpec)).toEqual(validDateSpec)
  })
  test('returns null when year is NaN', () => {
    const invalidDateSpec = {
      year: NaN,
      month: 7,
      day: 17,
      hour: 15,
      min: 30,
      sec: 45,
      subsec: 123
    }
    expect(isValidDateSpec(invalidDateSpec)).toBeFalsy()
  })
  test('returns null when month is out of range', () => {
    const invalidDateSpec = {
      year: 2023,
      month: Infinity,
      day: 17,
      hour: 15,
      min: 30,
      sec: 45,
      subsec: 123
    }
    expect(isValidDateSpec(invalidDateSpec)).toBeFalsy()
  })
  test('returns null when day is out of range', () => {
    const invalidDateSpec = {
      year: 2023,
      month: 7,
      day: null,
      hour: 15,
      min: 30,
      sec: 45,
      subsec: 123
    }
    expect(isValidDateSpec(invalidDateSpec as any)).toBeFalsy()
  })
  test('returns null when hour is out of range', () => {
    const invalidDateSpec = {
      year: 2023,
      month: 7,
      day: 17,
      hour: -Infinity,
      min: 30,
      sec: 45,
      subsec: 123
    }
    expect(isValidDateSpec(invalidDateSpec)).toBeFalsy()
  })
  test('returns null when minute is out of range', () => {
    const invalidDateSpec = {
      year: 2023,
      month: 7,
      day: 17,
      hour: 15,
      min: undefined,
      sec: 45,
      subsec: 123
    }
    expect(isValidDateSpec(invalidDateSpec as any)).toBeFalsy()
  })
  test('returns null when second is out of range', () => {
    const invalidDateSpec = {
      year: 2023,
      month: 7,
      day: 17,
      hour: 15,
      min: 30,
      sec: "",
      subsec: 123
    }
    expect(isValidDateSpec(invalidDateSpec as any)).toBeFalsy()
  })
  test('returns null when subsecond is NaN', () => {
    const invalidDateSpec = {
      year: 2023,
      month: 7,
      day: 17,
      hour: 15,
      min: 30,
      sec: 45,
      subsec: NaN
    }
    expect(isValidDateSpec(invalidDateSpec)).toBeFalsy()
  })
})

describe('fixYear', () => {
  test('returns year when year is 4 digits', () => {
    expect(fixYear(2023)).toEqual(2023)
  })
  test('returns year when year is 3 digits', () => {
    expect(fixYear(100)).toEqual(100)
    expect(fixYear(123)).toEqual(123)
  })
  test('returns 20xx year when year is 2 digits and less than 50', () => {
    expect(fixYear(10)).toEqual(2010)
    expect(fixYear(49)).toEqual(2049)
  })
  test('returns 19xx year when year is 2 digits and greater than or equal to 50', () => {
    expect(fixYear(50)).toEqual(1950)
    expect(fixYear(99)).toEqual(1999)
  })
})
