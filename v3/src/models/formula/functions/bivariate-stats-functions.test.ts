import { evaluate } from "../test-utils/formula-test-utils"
import { UNDEF_RESULT } from "./function-utils"

// Note that aggregate functions require formula-test-utils since they use the custom MathJS scope API to support
// caching. Therefore, they cannot be simply tested using basic MathJS evaluation, similar to arithmetic functions.

// Most of the tests use attributes from the Mammals dataset, comparing v3 results with v2.

describe("correlation", () => {
  it("returns correct value", () => {
    expect(evaluate("correlation(LifeSpan, Order)")).toBe(UNDEF_RESULT)
    expect(evaluate("correlation(LifeSpan, Speed)")).toBeCloseTo(-0.059392, 6)
    expect(evaluate("correlation(Height, Mass)")).toBeCloseTo(0.684623, 6)
  })
})

describe("linRegrIntercept", () => {
  it("returns correct value", () => {
    expect(evaluate("linRegrIntercept(LifeSpan, Order)")).toBe(UNDEF_RESULT)
    expect(evaluate("linRegrIntercept(LifeSpan, Speed)")).toBeCloseTo(50.722887, 6)
    expect(evaluate("linRegrIntercept(Height, Mass)")).toBeCloseTo(-516.767727, 6)
  })
})

describe("linRegrPredicted", () => {
  it("returns correct value", () => {
    expect(evaluate("linRegrPredicted(LifeSpan, Order)", 0)).toBe(UNDEF_RESULT)
    expect(evaluate("linRegrPredicted(LifeSpan, Speed)", 0)).toBeCloseTo(45.780786, 6)
    expect(evaluate("linRegrPredicted(LifeSpan, Speed)", 1)).toBeCloseTo(45.780786, 6)
    expect(evaluate("linRegrPredicted(LifeSpan, Speed)", 2)).toBeCloseTo(49.381459, 6)
    expect(evaluate("linRegrPredicted(Height, Mass)", 0)).toBeCloseTo(2398.1555, 6)
    expect(evaluate("linRegrPredicted(Height, Mass)", 1)).toBeCloseTo(1669.424693, 6)
    expect(evaluate("linRegrPredicted(Height, Mass)", 2)).toBeCloseTo(-443.894646, 6)
  })
})

describe("linRegrResidual", () => {
  it("returns correct value", () => {
    expect(evaluate("linRegrResidual(LifeSpan, Order)", 0)).toBe(UNDEF_RESULT)
    expect(evaluate("linRegrResidual(LifeSpan, Speed)", 0)).toBeCloseTo(-5.780786, 6)
    expect(evaluate("linRegrResidual(LifeSpan, Speed)", 1)).toBeCloseTo(-5.780786, 6)
    expect(evaluate("linRegrResidual(LifeSpan, Speed)", 2)).toBeCloseTo(-9.381459, 6)
    expect(evaluate("linRegrResidual(Height, Mass)", 0)).toBeCloseTo(4001.8445, 6)
    expect(evaluate("linRegrResidual(Height, Mass)", 1)).toBeCloseTo(3330.575307, 6)
    expect(evaluate("linRegrResidual(Height, Mass)", 2)).toBeCloseTo(443.914646, 6)
  })
})

describe("linRegrSESlope", () => {
  it("returns correct value", () => {
    expect(evaluate("linRegrSESlope(LifeSpan, Order)")).toBe(UNDEF_RESULT)
    expect(evaluate("linRegrSESlope(LifeSpan, Speed)")).toBeCloseTo(0.252991, 6)
    expect(evaluate("linRegrSESlope(Height, Mass)")).toBeCloseTo(155.171375, 6)
  })
})

describe("linRegrSlope", () => {
  it("returns correct value", () => {
    expect(evaluate("linRegrSlope(LifeSpan, Order)")).toBe(UNDEF_RESULT)
    expect(evaluate("linRegrSlope(LifeSpan, Speed)")).toBeCloseTo(-0.070601, 6)
    expect(evaluate("linRegrSlope(Height, Mass)")).toBeCloseTo(728.730807, 6)
  })
})

describe("rSquared", () => {
  it("returns correct value", () => {
    expect(evaluate("rSquared(LifeSpan, Order)")).toBe(UNDEF_RESULT)
    expect(evaluate("rSquared(LifeSpan, Speed)")).toBeCloseTo(0.003527, 6)
    expect(evaluate("rSquared(Height, Mass)")).toBeCloseTo(0.468709, 6)
  })
})
