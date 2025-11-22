import { BinDetails } from "./bin-details"

describe("BinDetails", () => {
  it("should create a valid BinDetails instance", () => {
    const binDetails = new BinDetails(0, 100)
    expect(binDetails.isValid).toBe(true)
  })

  it("should have default bin width and alignment", () => {
    const binDetails = new BinDetails(0, 100)
    expect(binDetails.binWidth).toBeDefined()
    expect(binDetails.binAlignment).toBeDefined()
  })

  it("should calculate bin edges correctly", () => {
    const binDetails = new BinDetails(0, 100, 10, 0)
    expect(binDetails.getMinBinEdge()).toBe(0)
    expect(binDetails.getMaxBinEdge()).toBe(110)
    expect(binDetails.getBinEdge(0)).toBe(0)
    expect(binDetails.getBinEdge(5)).toBe(50)
    expect(binDetails.getBinEdge(10)).toBe(100)
  })

  it("should calculate total number of bins correctly", () => {
    const binDetails = new BinDetails(0, 100, 10, 0)
    expect(binDetails.getTotalNumberOfBins()).toBe(11)
  })

  it("should determine bin for a given case value", () => {
    const binDetails = new BinDetails(0, 100, 10, 0)
    expect(binDetails.getBinForValue(0)).toBe(0)
    expect(binDetails.getBinForValue(5)).toBe(0)
    expect(binDetails.getBinForValue(25)).toBe(2)
    expect(binDetails.getBinForValue(100)).toBe(10)
  })

  it("should avoid floating point precision issues when determining bin for a case value", () => {
    const binDetails = new BinDetails(2.5, 4, 0.2, 2.4)
    expect(binDetails.getBinForValue(2.5)).toBe(0)
    expect(binDetails.getBinForValue(2.6)).toBe(1)
    expect(binDetails.getBinForValue(3.0)).toBe(3)
    expect(binDetails.getBinForValue(3.8)).toBe(7)
    expect(binDetails.getBinForValue(4.0)).toBe(8)
  })

  it("should calculate bin midpoints correctly", () => {
    const binDetails = new BinDetails(0, 100, 10, 0)
    expect(binDetails.getBinMidpoint(0)).toBe(5)
    expect(binDetails.getBinMidpoint(1)).toBe(15)
    expect(binDetails.getBinMidpoint(2)).toBe(25)
    expect(binDetails.getBinMidpoint(10)).toBe(105)
  })
})
