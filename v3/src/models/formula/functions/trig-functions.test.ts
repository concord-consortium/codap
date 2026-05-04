import { math } from "./math"
import { UNDEF_RESULT } from "./function-utils"

describe("trig functions", () => {
  it("provides sin", () => {
    expect(math.evaluate("sin(0)")).toBeCloseTo(0)
    expect(math.evaluate("sin(pi / 2)")).toBeCloseTo(1)
    expect(math.evaluate("sin(pi)")).toBeCloseTo(0)
  })
  it("provides cos", () => {
    expect(math.evaluate("cos(0)")).toBeCloseTo(1)
    expect(math.evaluate("cos(pi / 2)")).toBeCloseTo(0)
    expect(math.evaluate("cos(pi)")).toBeCloseTo(-1)
  })
  it("provides tan", () => {
    expect(math.evaluate("tan(0)")).toBeCloseTo(0)
    expect(math.evaluate("tan(pi / 4)")).toBeCloseTo(1)
  })
  it("provides asin", () => {
    expect(math.evaluate("asin(0)")).toBeCloseTo(0)
    expect(math.evaluate("asin(1)")).toBeCloseTo(Math.PI / 2)
    expect(math.evaluate("asin(-1)")).toBeCloseTo(-Math.PI / 2)
  })
  it("provides acos", () => {
    expect(math.evaluate("acos(1)")).toBeCloseTo(0)
    expect(math.evaluate("acos(0)")).toBeCloseTo(Math.PI / 2)
    expect(math.evaluate("acos(-1)")).toBeCloseTo(Math.PI)
  })
  it("provides atan", () => {
    expect(math.evaluate("atan(0)")).toBeCloseTo(0)
    expect(math.evaluate("atan(1)")).toBeCloseTo(Math.PI / 4)
  })
  it("provides atan2", () => {
    expect(math.evaluate("atan2(0, 1)")).toBeCloseTo(0)
    expect(math.evaluate("atan2(1, 0)")).toBeCloseTo(Math.PI / 2)
    expect(math.evaluate("atan2(1, 1)")).toBeCloseTo(Math.PI / 4)
  })
  it("coerces numeric strings", () => {
    expect(math.evaluate("sin('0')")).toBeCloseTo(0)
    expect(math.evaluate("atan2('1', '1')")).toBeCloseTo(Math.PI / 4)
  })
  it("returns UNDEF_RESULT for non-numeric input", () => {
    expect(math.evaluate("sin('')")).toBe(UNDEF_RESULT)
    expect(math.evaluate("cos('abc')")).toBe(UNDEF_RESULT)
    expect(math.evaluate("atan2('', 1)")).toBe(UNDEF_RESULT)
  })
})
