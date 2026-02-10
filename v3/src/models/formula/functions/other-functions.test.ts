import { UNDEF_RESULT } from "./function-utils"
import { math } from "./math"

describe("if", () => {
  it("implements if logic", () => {
    const fn = math.compile("if(x < 10, 'foo', 'bar')")
    expect(fn.evaluate({ x: 9 })).toEqual("foo")
    expect(fn.evaluate({ x: 11 })).toEqual("bar")

    const fn2 = math.compile("if('', 'foo', 'bar')")
    expect(fn2.evaluate()).toEqual("")
  })
})

describe("randomPick", () => {
  it("returns one of the values", () => {
    const fn = math.compile("randomPick('foo', 'bar', 'baz')")
    const result = fn.evaluate()
    expect(result === "foo" || result === "bar" || result === "baz").toBeTruthy()
  })
})

describe("random", () => {
  it("returns random number between 0 and 1", () => {
    const fn = math.compile("random()")
    const result = fn.evaluate()
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })

  it("returns random number between 0 and max", () => {
    const fn = math.compile("random(10)")
    const result = fn.evaluate()
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(10)
  })

  it("returns random number between min and max", () => {
    const fn = math.compile("random(10, 20)")
    const result = fn.evaluate()
    expect(result).toBeGreaterThanOrEqual(10)
    expect(result).toBeLessThanOrEqual(20)
  })
})

describe("randomNormal", () => {
  it("returns random numbers between with a mean of 10 and a standard deviation of 5", () => {
    const fn = math.compile("randomNormal(10, 5)")
    const numbers = Array.from({ length: 1000 }, () => fn.evaluate()),
      mean = numbers.reduce((a, b) => a + b) / numbers.length,
      stdDev = Math.sqrt(numbers.reduce((a, b) => a + (b - mean) ** 2) / numbers.length)
    expect(mean).toBeGreaterThanOrEqual(9.5)
    expect(mean).toBeLessThanOrEqual(10.5)
    expect(stdDev).toBeGreaterThanOrEqual(4)
    expect(stdDev).toBeLessThanOrEqual(6)
  })
})

describe("randomBinomial", () => {
  it("returns random integers between 0 and 5", () => {
    const fn = math.compile("randomBinomial(5, 0.5)")
    const integers = Array.from({ length: 100 }, () => fn.evaluate())
    expect(integers.every((n) => Math.round(n) === n && n >= 0 && n <= 5)).toBeTruthy()
  })
})

describe("number", () => {
  // CODAP's number() is registered as _number_ to avoid colliding with mathjs's internal number().
  // In production, canonicalization maps "number(...)" → "_number_(...)".
  it("converts a date to epoch time in seconds", () => {
    const fn = math.compile("_number_(date(100500))")
    expect(fn.evaluate()).toEqual(100500)
  })

  it("converts a date string to epoch time in seconds", () => {
    const fn = math.compile("_number_('01/01/2020')")
    expect(fn.evaluate()).toEqual(new Date('01/01/2020').getTime() / 1000) // Convert to seconds
  })

  it("returns UNDEF_RESULT for non-date values", () => {
    const fn = math.compile("_number_('foo')")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})

describe("greatCircleDistance", () => {
  it("returns empty if not enough numeric arguments are provided", () => {
    expect(math.compile("greatCircleDistance()").evaluate()).toBe(UNDEF_RESULT)
    expect(math.compile("greatCircleDistance(0)").evaluate()).toBe(UNDEF_RESULT)
    expect(math.compile("greatCircleDistance(0, 0)").evaluate()).toBe(UNDEF_RESULT)
    expect(math.compile("greatCircleDistance(0, 0, 0)").evaluate()).toBe(UNDEF_RESULT)
    expect(math.compile("greatCircleDistance(0, 0, 0, 'a')").evaluate()).toBe(UNDEF_RESULT)
    expect(math.compile("greatCircleDistance('a', 'b', 'c', 'd')").evaluate()).toBe(UNDEF_RESULT)
  })

  it("returns valid values for legitimate arguments", () => {
    const fn = math.compile("greatCircleDistance(lat1, long1, lat2, long2)")
    // distance from New York to San Francisco (CODAP example)
    // note: the CODAP example uses positive longitudes where negative longitudes would be expected
    // This doesn't affect the result, but could be confusing.
    expect(fn.evaluate({ lat1: 40.66, long1: -74, lat2: 37.8, long2: -122.4 })).toBeCloseTo(4128, -1)
    // distance from New York to London (ChatGPT)
    expect(fn.evaluate({ lat1: 40.7128, long1: -74.0060, lat2: 51.5074, long2: -0.1278 })).toBeCloseTo(5571, -1)
    // distance from Tokyo to Sydney (ChatGPT)
    // TODO: CODAP's result (7826) fails this test -- who's right?
    // expect(fn.evaluate({ lat1: 35.6762, long1: 139.6503, lat2: -33.8688, long2: 151.2093 })).toBeCloseTo(7395, -1)
  })
})
