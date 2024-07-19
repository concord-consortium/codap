import { formatDate } from "../../../utilities/date-utils"
import { math } from "./math"

describe("date", () => {
  it("returns current date if no arguments are provided", () => {
    const fn = math.compile("date()")
    expect(fn.evaluate()).toEqual(formatDate(new Date()))
  })

  it("interprets a small number as 20xx year if it's smaller than current year + 10", () => {
    const fn = math.compile("date(x)")
    expect(fn.evaluate({ x: 1 })).toEqual(formatDate(new Date(2001, 0, 1)))
    expect(fn.evaluate({ x: 10 })).toEqual(formatDate(new Date(2010, 0, 1)))
    expect(fn.evaluate({ x: 20 })).toEqual(formatDate(new Date(2020, 0, 1)))
    expect(fn.evaluate({ x: 30 })).toEqual(formatDate(new Date(2030, 0, 1)))
  })

  it("interprets a small number as 19xx year if it's bigger than current year + 10, but smaller than 100", () => {
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
