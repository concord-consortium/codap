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

describe("dateToEpoch", () => {
  it("returns epoch seconds for a date object or date string", () => {
    const fn = math.compile("dateToEpoch(x)")
    expect(fn.evaluate({ x: new Date(Date.UTC(2023, 10, 14, 22, 13, 20)) })).toBe(1700000000)
    expect(fn.evaluate({ x: "2023-11-14T22:13:20+00:00" })).toBe(1700000000)
    expect(fn.evaluate({ x: "11/14/2023 17:13:20" })).toBe(new Date(2023, 10, 14, 17, 13, 20).getTime() / 1000)
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
    expect(fn.evaluate({ x: 1700000000, unit: "minutes" })).toBe(UNDEF_RESULT)
  })

  it("returns UNDEF_RESULT for values that aren't numbers or are out of range", () => {
    const fn = math.compile("epochToDate(x)")
    expect(fn.evaluate({ x: "hello" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: "" })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: true })).toBe(UNDEF_RESULT)
    expect(fn.evaluate({ x: new Date() })).toBe(UNDEF_RESULT)
    // JS dates span ±8.64e15 ms, i.e. ±8.64e12 seconds
    expect(fn.evaluate({ x: 8.64e12 + 1 })).toBe(UNDEF_RESULT)
  })

  it("round-trips with dateToEpoch", () => {
    expect(math.compile("dateToEpoch(epochToDate(1700000000))").evaluate()).toBe(1700000000)
    expect(math.compile("epochToDate(dateToEpoch(x))").evaluate({ x: new Date(2020, 5, 15, 8, 30) }))
      .toEqual(new Date(2020, 5, 15, 8, 30))
  })
})
