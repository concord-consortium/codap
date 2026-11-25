import { UNDEF_RESULT } from "./function-utils"
import { math } from "./math"

describe("date", () => {
  it("returns current date if no arguments are provided", () => {
    const fn = math.compile("date()")
    expect(fn.evaluate().valueOf()).toBeCloseTo(Date.now(), -3)
  })

  it("interprets [0, 50) as 20xx year", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 1 })).toEqual(new Date(2001, 0, 1))
    expect(fn.evaluate({ x: 10 })).toEqual(new Date(2010, 0, 1))
    expect(fn.evaluate({ x: 20 })).toEqual(new Date(2020, 0, 1))
    expect(fn.evaluate({ x: 30 })).toEqual(new Date(2030, 0, 1))
    expect(fn.evaluate({ x: 49 })).toEqual(new Date(2049, 0, 1))
  })

  it("interprets [50, 99] as 19xx year", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 50 })).toEqual(new Date(1950, 0, 1))
    expect(fn.evaluate({ x: 60 })).toEqual(new Date(1960, 0, 1))
    expect(fn.evaluate({ x: 70 })).toEqual(new Date(1970, 0, 1))
    expect(fn.evaluate({ x: 99 })).toEqual(new Date(1999, 0, 1))
  })

  it("interprets number as year if it's bigger than 100 but smaller than 5000", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 100 })).toEqual(new Date(100, 0, 1))
    expect(fn.evaluate({ x: 1000 })).toEqual(new Date(1000, 0, 1))
    expect(fn.evaluate({ x: 2000 })).toEqual(new Date(2000, 0, 1))
    expect(fn.evaluate({ x: 4999 })).toEqual(new Date(4999, 0, 1))
  })

  it("interprets number as epoch seconds if it's bigger than 5000", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 5000 })).toEqual(new Date(5000 * 1000))
    expect(fn.evaluate({ x: 10000 })).toEqual(new Date(10000 * 1000))
    expect(fn.evaluate({ x: 12345 })).toEqual(new Date(12345 * 1000))
  })

  it("supports month, day, hours, minutes, seconds, and milliseconds arguments", () => {
    const fn = math.compile("date(2020, 2, 3, 4, 5, 6, 7)")
    expect(fn.evaluate()).toEqual(new Date(2020, 1, 3, 4, 5, 6, 7))
    const fn2 = math.compile("date(2020, 2, 3)")
    expect(fn2.evaluate()).toEqual(new Date(2020, 1, 3))
    const fn3 = math.compile("date(2020, 2)")
    expect(fn3.evaluate()).toEqual(new Date(2020, 1, 1))
  })

  it("assumes month is in range 1-12, but 0 is interpreted as January", () => {
    const fn = math.compile("date(2020, 0, 1)")
    expect(fn.evaluate()).toEqual(new Date(2020, 0, 1))
    const fn2 = math.compile("date(2020, 5, 1)")
    expect(fn2.evaluate()).toEqual(new Date(2020, 4, 1))
  })
})

describe("year", () => {
  it("returns the year of the provided date object", () => {
    const fn = math.compile("year(date(2020, 2, 3))")
    expect(fn.evaluate()).toEqual(2020)
  })

  it("returns the year of the provided date string", () => {
    const fn = math.compile("year('2020-02-03')")
    expect(fn.evaluate()).toEqual(2020)
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("year(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("month", () => {
  it("returns the month of the provided date object", () => {
    const fn = math.compile("month(date(2020, 2, 3))")
    expect(fn.evaluate()).toEqual(2)
  })

  it("returns the month of the provided date string", () => {
    const fn = math.compile("month('2020-02-03')")
    expect(fn.evaluate()).toEqual(2)
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("month(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("monthName", () => {
  it("returns the month name of the provided date object", () => {
    const fn = math.compile("monthName(date(2020, 2, 3))")
    expect(fn.evaluate()).toEqual("February")
  })

  it("returns the month name of the provided date string", () => {
    const fn = math.compile("monthName('2020-02-03')")
    expect(fn.evaluate()).toEqual("February")
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("monthName(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("dayOfMonth", () => {
  it("returns the day of the month of the provided date object", () => {
    const fn = math.compile("dayOfMonth(date(2020, 2, 3))")
    expect(fn.evaluate()).toEqual(3)
  })

  it("returns the day of the month of the provided date string", () => {
    const fn = math.compile("dayOfMonth('2020-02-03')")
    expect(fn.evaluate()).toEqual(3)
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("dayOfMonth(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("dayOfWeek", () => {
  it("returns the day of the week of the provided date object", () => {
    const fn = math.compile("dayOfWeek(date(2020, 2, 3))")
    expect(fn.evaluate()).toEqual(2) // Sunday is 1, Monday is 2
  })

  it("returns the day of the week of the provided date string", () => {
    const fn = math.compile("dayOfWeek('2020-02-03')")
    expect(fn.evaluate()).toEqual(2) // Sunday is 1, Monday is 2
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("dayOfWeek(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("dayOfWeekName", () => {
  it("returns the day of the week name of the provided date object", () => {
    const fn = math.compile("dayOfWeekName(date(2020, 2, 3))")
    expect(fn.evaluate()).toEqual("Monday")
  })

  it("returns the day of the week name of the provided date string", () => {
    const fn = math.compile("dayOfWeekName('2020-02-03')")
    expect(fn.evaluate()).toEqual("Monday")
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("dayOfWeekName(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("hours", () => {
  it("returns the hours of the provided date object", () => {
    const fn = math.compile("hours(date(2020, 2, 3, 4, 5, 6, 7))")
    expect(fn.evaluate()).toEqual(4)
  })

  it("returns the hours of the provided date string", () => {
    const fn = math.compile("hours('2020-02-03T04:05:06.007Z')")
    expect(fn.evaluate()).toEqual(4)
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("hours(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })

  it("returns the hours of a time-only string", () => {
    expect(math.compile("hours('13:45:30')").evaluate()).toEqual(13)
    expect(math.compile("hours('1:45 AM')").evaluate()).toEqual(1)
  })

  it("returns undefined for an invalid time-only string", () => {
    expect(math.compile("hours('25:00')").evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("minutes", () => {
  it("returns the minutes of the provided date object", () => {
    const fn = math.compile("minutes(date(2020, 2, 3, 4, 5, 6, 7))")
    expect(fn.evaluate()).toEqual(5)
  })

  it("returns the minutes of the provided date string", () => {
    const fn = math.compile("minutes('2020-02-03T04:05:06.007Z')")
    expect(fn.evaluate()).toEqual(5)
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("minutes(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })

  it("returns the minutes of a time-only string", () => {
    expect(math.compile("minutes('13:45:30')").evaluate()).toEqual(45)
    expect(math.compile("minutes('1:45 AM')").evaluate()).toEqual(45)
  })

  it("returns undefined for an invalid time-only string", () => {
    expect(math.compile("minutes('25:00')").evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("seconds", () => {
  it("returns the seconds of the provided date object", () => {
    const fn = math.compile("seconds(date(2020, 2, 3, 4, 5, 6, 7))")
    expect(fn.evaluate()).toEqual(6)
  })

  it("returns the seconds of the provided date string", () => {
    const fn = math.compile("seconds('2020-02-03T04:05:06.007Z')")
    expect(fn.evaluate()).toEqual(6)
  })

  it("returns undefined if the date is incorrect", () => {
    const fn = math.compile("seconds(null)")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })

  it("returns the seconds of a time-only string", () => {
    expect(math.compile("seconds('13:45:30')").evaluate()).toEqual(30)
    expect(math.compile("seconds('1:45 AM')").evaluate()).toEqual(0)
  })

  it("returns undefined for an invalid time-only string", () => {
    expect(math.compile("seconds('25:00')").evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("now", () => {
  it("returns the current date", () => {
    const fn = math.compile("now()")
    expect(fn.evaluate().valueOf()).toBeCloseTo(Date.now(), -3)
  })
})

describe("today", () => {
  it("returns the current date without time", () => {
    const fn = math.compile("today()")
    const now = new Date()
    expect(fn.evaluate()).toEqual(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  })
})

describe("combining a date with a time-only string", () => {
  it("builds a date/time from separate date and time values", () => {
    const fn = math.compile(
      "date(year(d), month(d), dayOfMonth(d), hours(t), minutes(t), seconds(t))"
    )
    const result = fn.evaluate({ d: "2026-10-27", t: "1:45:30 PM" })
    expect(result).toEqual(new Date(2026, 9, 27, 13, 45, 30))
  })
})

describe("dateToEpoch", () => {
  it("returns epoch seconds for a date object or date string", () => {
    const fn = math.compile("dateToEpoch(x)")
    expect(fn.evaluate({ x: new Date(Date.UTC(2023, 10, 14, 22, 13, 20)) })).toBe(1700000000)
    expect(fn.evaluate({ x: "2023-11-14T22:13:20+00:00" })).toBe(1700000000)
    expect(fn.evaluate({ x: "11/14/2023 17:13:20" })).toBe(new Date(2023, 10, 14, 17, 13, 20).getTime() / 1000)
    expect(fn.evaluate({ x: "11/14/2023, 17:13:20" })).toBe(new Date(2023, 10, 14, 17, 13, 20).getTime() / 1000)
    expect(math.compile("dateToEpoch(date(2020, 1, 1))").evaluate()).toBe(new Date(2020, 0, 1).getTime() / 1000)
  })

  it("reads a date string ending in a bare 'Z' as local time", () => {
    const fn = math.compile("dateToEpoch(x)")
    expect(fn.evaluate({ x: "2023-11-14T22:13:20Z" })).toBe(new Date(2023, 10, 14, 22, 13, 20).getTime() / 1000)
  })

  it("keeps fractional seconds", () => {
    const fn = math.compile("dateToEpoch(x)")
    expect(fn.evaluate({ x: new Date(1700000000500) })).toBe(1700000000.5)
  })

  it("returns numbers and numeric strings unchanged, without treating small values as years", () => {
    const fn = math.compile("dateToEpoch(x)")
    expect(fn.evaluate({ x: 0 })).toBe(0)
    expect(fn.evaluate({ x: 2000 })).toBe(2000)
    expect(fn.evaluate({ x: -86400 })).toBe(-86400)
    expect(fn.evaluate({ x: 1.5 })).toBe(1.5)
    expect(fn.evaluate({ x: 1700000000 })).toBe(1700000000)
    expect(fn.evaluate({ x: "0" })).toBe(0)
    expect(fn.evaluate({ x: "1700000000" })).toBe(1700000000)
  })

  it("returns UNDEF_RESULT for values that aren't dates", () => {
    const fn = math.compile("dateToEpoch(x)")
    expect(fn.evaluate({ x: "not a date" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: "" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: "   " })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: true })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: false })).toBe(UNDEF_RESULT)
  })

  it("supports an optional unit argument", () => {
    const fn = math.compile("dateToEpoch(x, unit)")
    const date = new Date(1700000000123)
    expect(fn.evaluate({ x: date, unit: "s" })).toBe(1700000000.123)
    expect(fn.evaluate({ x: date, unit: "seconds" })).toBe(1700000000.123)
    expect(fn.evaluate({ x: date, unit: "ms" })).toBe(1700000000123)
    expect(fn.evaluate({ x: date, unit: " Milliseconds " })).toBe(1700000000123)
    expect(fn.evaluate({ x: date, unit: "us" })).toBe(1700000000123000)
    expect(fn.evaluate({ x: date, unit: "μs" })).toBe(1700000000123000)
    expect(fn.evaluate({ x: date, unit: "ns" })).toBe(1700000000123000000)
    expect(fn.evaluate({ x: new Date(28333333 * 60000), unit: "min" })).toBe(28333333)
    expect(fn.evaluate({ x: date, unit: "sec" })).toBe(1700000000.123)
    expect(fn.evaluate({ x: date, unit: "second" })).toBe(1700000000.123)
    expect(fn.evaluate({ x: date, unit: "millisecond" })).toBe(1700000000123)
  })

  it("throws an error listing the valid units for an unrecognized unit", () => {
    const fn = math.compile("dateToEpoch(x, unit)")
    const date = new Date(1700000000123)
    for (const unit of ["hours", "constructor", "__proto__", ""]) {
      expect(() => fn.evaluate({ x: date, unit })).toThrow("The 'dateToEpoch()' function's unit must be one of: s, min")
    }
    // The unit is checked even when the date is a number
    expect(() => fn.evaluate({ x: 0, unit: "hours" })).toThrow()
  })

  it("converts numbers from epoch seconds to the given unit", () => {
    const fn = math.compile("dateToEpoch(x, unit)")
    expect(fn.evaluate({ x: 1700000000, unit: "ms" })).toBe(1700000000000)
    expect(fn.evaluate({ x: 1.1, unit: "s" })).toBe(1.1)
    expect(fn.evaluate({ x: 120, unit: "min" })).toBe(2)
    expect(fn.evaluate({ x: 1700000000, unit: "us" })).toBe(1700000000000000)
    expect(fn.evaluate({ x: 1700000000, unit: "ns" })).toBe(1700000000000000000)
    expect(fn.evaluate({ x: "1700000000", unit: "ms" })).toBe(1700000000000)
  })

  it("returns UNDEF_RESULT instead of NaN or Infinity", () => {
    const fn = math.compile("dateToEpoch(x, unit)")
    expect(fn.evaluate({ x: NaN, unit: "s" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: Infinity, unit: "s" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: -Infinity, unit: "ms" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: "Infinity", unit: "s" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: 1e300, unit: "ns" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: new Date(NaN), unit: "s" })).toBe(UNDEF_RESULT)
    expect(math.compile("dateToEpoch(1/0)").evaluate()).toBe(UNDEF_RESULT)
    expect(math.compile("dateToEpoch(now() + 1e300)").evaluate()).toBe(UNDEF_RESULT)
  })
})

describe("epochToDate", () => {
  it("converts epoch seconds to a date", () => {
    const fn = math.compile("epochToDate(x)")
    expect(fn.evaluate({ x: 1700000000 })).toEqual(new Date(1700000000 * 1000))
    expect(fn.evaluate({ x: "1700000000" })).toEqual(new Date(1700000000 * 1000))
    expect(fn.evaluate({ x: -86400 })).toEqual(new Date(-86400 * 1000))
  })

  it("treats small values as epoch seconds rather than years", () => {
    const fn = math.compile("epochToDate(x)")
    expect(fn.evaluate({ x: 0 })).toEqual(new Date(0))
    expect(fn.evaluate({ x: 2000 })).toEqual(new Date(2000 * 1000))
  })

  it("keeps fractional seconds", () => {
    const fn = math.compile("epochToDate(x)")
    expect(fn.evaluate({ x: 1.5 })).toEqual(new Date(1500))
  })

  it("supports an optional unit argument", () => {
    const fn = math.compile("epochToDate(x, unit)")
    const expected = new Date(1700000000123)
    expect(fn.evaluate({ x: 1700000000123, unit: "milliseconds" })).toEqual(expected)
    expect(fn.evaluate({ x: 1700000000123, unit: "ms" })).toEqual(expected)
    expect(fn.evaluate({ x: 1700000000123, unit: " Milliseconds " })).toEqual(expected)
    expect(fn.evaluate({ x: 1700000000, unit: "seconds" })).toEqual(new Date(1700000000000))
    expect(fn.evaluate({ x: 1700000000, unit: "s" })).toEqual(new Date(1700000000000))
    expect(fn.evaluate({ x: 28333333, unit: "min" })).toEqual(new Date(28333333 * 60000))
    expect(fn.evaluate({ x: 28333333, unit: "minutes" })).toEqual(new Date(28333333 * 60000))
    expect(fn.evaluate({ x: 1700000000123456, unit: "us" })).toEqual(expected)
    expect(fn.evaluate({ x: 1700000000123456, unit: "μs" })).toEqual(expected) // Greek mu
    expect(fn.evaluate({ x: 1700000000123456, unit: "µs" })).toEqual(expected) // micro sign
    expect(fn.evaluate({ x: 1700000000123456, unit: "microseconds" })).toEqual(expected)
    expect(fn.evaluate({ x: "1700000000123456789", unit: "ns" })).toEqual(expected)
    expect(fn.evaluate({ x: "1700000000123456789", unit: "nanoseconds" })).toEqual(expected)
    expect(fn.evaluate({ x: 1700000000, unit: "sec" })).toEqual(new Date(1700000000000))
    expect(fn.evaluate({ x: 1700000000, unit: "second" })).toEqual(new Date(1700000000000))
    expect(fn.evaluate({ x: 28333333, unit: "minute" })).toEqual(new Date(28333333 * 60000))
    expect(fn.evaluate({ x: 1700000000123, unit: "millisecond" })).toEqual(expected)
    expect(fn.evaluate({ x: 1700000000123456, unit: "microsecond" })).toEqual(expected)
    expect(fn.evaluate({ x: "1700000000123456789", unit: "nanosecond" })).toEqual(expected)
  })

  it("throws an error listing the valid units for an unrecognized unit", () => {
    const fn = math.compile("epochToDate(x, unit)")
    for (const unit of ["hours", "constructor", "__proto__", ""]) {
      expect(() => fn.evaluate({ x: 1700000000, unit }))
        .toThrow("The 'epochToDate()' function's unit must be one of: s, min")
    }
    // The unit is checked even when the value isn't a number
    expect(() => fn.evaluate({ x: true, unit: "hours" })).toThrow()
  })

  it("rounds to the nearest millisecond", () => {
    const fn = math.compile("epochToDate(x, unit)")
    // Float error puts these just below a whole millisecond, e.g. 1091312667.84 * 1000 is 1091312667839.9999
    expect(fn.evaluate({ x: 1.001, unit: "s" })).toEqual(new Date(1001))
    expect(fn.evaluate({ x: -1.001, unit: "s" })).toEqual(new Date(-1001))
    expect(fn.evaluate({ x: 1091312667.84, unit: "s" })).toEqual(new Date(1091312667840))

    // Sub-millisecond units round to the nearest millisecond
    expect(fn.evaluate({ x: 1500, unit: "us" })).toEqual(new Date(2))
    expect(fn.evaluate({ x: 1400, unit: "us" })).toEqual(new Date(1))
  })

  it("converts whole microseconds exactly", () => {
    const fn = math.compile("epochToDate(x, \"us\")")
    expect(fn.evaluate({ x: 1700000000123000 })).toEqual(new Date(1700000000123))
  })

  it("returns UNDEF_RESULT for values that aren't numbers or are out of range", () => {
    const fn = math.compile("epochToDate(x)")
    expect(fn.evaluate({ x: "hello" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: "" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: true })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: new Date() })).toBe(UNDEF_RESULT)
    // JS dates span ±8.64e15 ms, i.e. ±8.64e12 seconds
    expect(fn.evaluate({ x: 8.64e12 + 1 })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: -8.64e12 - 1 })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: 8.64e12 })).toEqual(new Date(8.64e15))
    expect(fn.evaluate({ x: -8.64e12 })).toEqual(new Date(-8.64e15))
    expect(fn.evaluate({ x: NaN })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: Infinity })).toBe(UNDEF_RESULT)
  })

  it("round-trips with dateToEpoch", () => {
    expect(math.compile("dateToEpoch(epochToDate(1700000000))").evaluate()).toBe(1700000000)
    expect(math.compile("epochToDate(dateToEpoch(x))").evaluate({ x: new Date(2020, 5, 15, 8, 30) }))
      .toEqual(new Date(2020, 5, 15, 8, 30))
  })

  it("round-trips with dateToEpoch in other units", () => {
    expect(math.compile("dateToEpoch(epochToDate(1700000000123, \"ms\"), \"ms\")").evaluate()).toBe(1700000000123)
    expect(math.compile("dateToEpoch(epochToDate(28333333, \"min\"), \"min\")").evaluate()).toBe(28333333)
    expect(math.compile("dateToEpoch(epochToDate(1091312667.84))").evaluate()).toBe(1091312667.84)
    expect(math.compile("dateToEpoch(epochToDate(1.001))").evaluate()).toBe(1.001)
  })
})
