import { UNDEF_RESULT } from "./function-utils"
import { math } from "./math"

describe("if", () => {
  it("implements if logic", () => {
    const fn = math.compile("if(x < 10, 'foo', 'bar')")
    expect(fn.evaluate({ x: 9 })).toEqual("foo")
    expect(fn.evaluate({ x: 11 })).toEqual("bar")
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
  it("converts a date to epoch time in seconds", () => {
    const fn = math.compile("number(date(100500))")
    expect(fn.evaluate()).toEqual(100500)
  })

  it("converts a date string to epoch time in seconds", () => {
    const fn = math.compile("number('01/01/2020')")
    expect(fn.evaluate()).toEqual(new Date('01/01/2020').getTime() / 1000) // Convert to seconds
  })

  it("returns UNDEF_RESULT for non-date values", () => {
    const fn = math.compile("number('foo')")
    expect(fn.evaluate()).toEqual(UNDEF_RESULT)
  })
})
