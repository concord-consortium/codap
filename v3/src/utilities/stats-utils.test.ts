import { certifiedResults as norrisResults, data as norrisData } from "./nist-norris"
import { certifiedResults as noInt1Results, data as noInt1Data } from "./nist-noint1"
import {
  computeBivariateStats, correlation, leastSquaresLinearRegression, linRegrIntercept, linRegrSlope,
  linRegrStdErrSlopeAndIntercept, rSquared, XYValues
} from "./stats-utils"

describe("stats-utils", () => {

  it("returns expected values for empty data", () => {
    const { count } = computeBivariateStats([])
    expect(count).toBe(0)
    expect(correlation([])).toBeNaN()
    expect(rSquared([])).toBeNaN()
    expect(linRegrIntercept([])).toBeNaN()
    expect(linRegrSlope([])).toBeNaN()
    const { stdErrSlope, stdErrIntercept } = linRegrStdErrSlopeAndIntercept([])
    expect(stdErrIntercept).toBeNaN()
    expect(stdErrSlope).toBeNaN()
  })

  it("returns expected values for perfect regression (exactly two points)", () => {
    const values: XYValues = [{ x: 0, y: 0 }, { x: 1, y: 1 }]
    const { count } = computeBivariateStats(values)
    expect(count).toBe(2)
    expect(correlation(values)).toBe(1)
    expect(rSquared(values)).toBe(1)
    expect(linRegrIntercept(values)).toBe(0)
    expect(linRegrSlope(values)).toBe(1)
    const { stdErrSlope, stdErrIntercept } = linRegrStdErrSlopeAndIntercept(values)
    expect(stdErrIntercept).toBe(0)
    expect(stdErrSlope).toBe(0)
  })

  it("matches results from NIST Norris data set", () => {
    const { count } = computeBivariateStats(norrisData)
    expect(count).toBe(36)
    expect(linRegrIntercept(norrisData)).toBeCloseTo(norrisResults.intercept, 10)
    expect(linRegrSlope(norrisData)).toBeCloseTo(norrisResults.slope, 10)
    const norrisCorrelation = correlation(norrisData)
    expect(norrisCorrelation * norrisCorrelation).toBeCloseTo(norrisResults.rSquared, 10)
    expect(rSquared(norrisData)).toBeCloseTo(norrisResults.rSquared, 10)
    const { stdErrSlope, stdErrIntercept } = linRegrStdErrSlopeAndIntercept(norrisData)
    expect(stdErrIntercept).toBeCloseTo(norrisResults.sdIntercept, 10)
    expect(stdErrSlope).toBeCloseTo(norrisResults.sdSlope, 10)
  })

  it("matches results from NIST NoIntercept1 data set", () => {
    const { count, rSquared: rSquaredResult, slope } = leastSquaresLinearRegression(noInt1Data, true)
    expect(count).toBe(11)
    expect(slope).toBeCloseTo(noInt1Results.slope, 10)
    expect(rSquaredResult).toBeCloseTo(noInt1Results.rSquared, 10)
  })

})
