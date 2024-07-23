import { formatDate } from "../../../utilities/date-utils"
import { UNDEF_RESULT } from "./function-utils"
import { math } from "./math"

describe("date", () => {
  it("returns current date if no arguments are provided", () => {
    const fn = math.compile("date()")
    expect(fn.evaluate()).toEqual(formatDate(new Date()))
  })

  it("interprets [0, 50) as 20xx year", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 1 })).toEqual(formatDate(new Date(2001, 0, 1)))
    expect(fn.evaluate({ x: 10 })).toEqual(formatDate(new Date(2010, 0, 1)))
    expect(fn.evaluate({ x: 20 })).toEqual(formatDate(new Date(2020, 0, 1)))
    expect(fn.evaluate({ x: 30 })).toEqual(formatDate(new Date(2030, 0, 1)))
    expect(fn.evaluate({ x: 49 })).toEqual(formatDate(new Date(2049, 0, 1)))
  })

  it("interprets [50, 99] as 19xx year", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 50 })).toEqual(formatDate(new Date(1950, 0, 1)))
    expect(fn.evaluate({ x: 60 })).toEqual(formatDate(new Date(1960, 0, 1)))
    expect(fn.evaluate({ x: 70 })).toEqual(formatDate(new Date(1970, 0, 1)))
    expect(fn.evaluate({ x: 99 })).toEqual(formatDate(new Date(1999, 0, 1)))
  })

  it("interprets number as year if it's bigger than 100 but smaller than 5000", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 100 })).toEqual(formatDate(new Date(100, 0, 1)))
    expect(fn.evaluate({ x: 1000 })).toEqual(formatDate(new Date(1000, 0, 1)))
    expect(fn.evaluate({ x: 2000 })).toEqual(formatDate(new Date(2000, 0, 1)))
    expect(fn.evaluate({ x: 4999 })).toEqual(formatDate(new Date(4999, 0, 1)))
  })

  it("interprets number as epoch seconds if it's bigger than 5000", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 5000 })).toEqual(formatDate(new Date(5000 * 1000)))
    expect(fn.evaluate({ x: 10000 })).toEqual(formatDate(new Date(10000 * 1000)))
    expect(fn.evaluate({ x: 12345 })).toEqual(formatDate(new Date(12345 * 1000)))
  })

  it("supports month, day, hours, minutes, seconds, and milliseconds arguments", () => {
    const fn = math.compile("date(2020, 2, 3, 4, 5, 6, 7)")
    expect(fn.evaluate()).toEqual(formatDate(new Date(2020, 1, 3, 4, 5, 6, 7)))
    const fn2 = math.compile("date(2020, 2, 3)")
    expect(fn2.evaluate()).toEqual(formatDate(new Date(2020, 1, 3)))
    const fn3 = math.compile("date(2020, 2)")
    expect(fn3.evaluate()).toEqual(formatDate(new Date(2020, 1, 1)))
  })

  it("assumes month is in range 1-12, but 0 is interpreted as January", () => {
    const fn = math.compile("date(2020, 0, 1)")
    expect(fn.evaluate()).toEqual(formatDate(new Date(2020, 0, 1)))
    const fn2 = math.compile("date(2020, 5, 1)")
    expect(fn2.evaluate()).toEqual(formatDate(new Date(2020, 4, 1)))
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

describe("now", () => {
  it("returns the current date", () => {
    const fn = math.compile("now()")
    expect(fn.evaluate()).toEqual(formatDate(new Date()))
  })
})

describe("today", () => {
  it("returns the current date without time", () => {
    const fn = math.compile("today()")
    const now = new Date()
    expect(fn.evaluate()).toEqual(formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())))
  })
})
