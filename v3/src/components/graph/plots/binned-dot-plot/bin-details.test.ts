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

  it("should determine bin for large values such as dates in seconds", () => {
    const minDate = Date.UTC(2024, 0, 5) / 1000
    const maxDate = Date.UTC(2024, 11, 20) / 1000
    const dateBinDetails = new BinDetails(minDate, maxDate)
    expect(dateBinDetails.binValuePrecision).toBeLessThan(0)
    expect(dateBinDetails.getBinForValue(minDate)).toBe(0)
    expect(dateBinDetails.getBinForValue((minDate + maxDate) / 2)).toBe(3)
    expect(dateBinDetails.getBinForValue(maxDate)).toBe(6)

    const binDetails = new BinDetails(1000000, 5000000)
    expect(binDetails.getBinForValue(1000000)).toBe(0)
    expect(binDetails.getBinForValue(3500000)).toBe(2)
    expect(binDetails.getBinForValue(4900000)).toBe(3)
    expect(binDetails.getBinForValue(5000000)).toBe(4)
  })

  it("should keep values just below a bin edge in the lower bin", () => {
    const dayInSeconds = 86400
    const minDate = Date.UTC(2024, 0, 5) / 1000
    const maxDate = minDate + 10 * dayInSeconds - 300
    const binDetails = new BinDetails(minDate, maxDate, dayInSeconds, minDate)
    const firstEdge = minDate + dayInSeconds
    expect(binDetails.getBinForValue(firstEdge - 1)).toBe(0)
    expect(binDetails.getBinForValue(firstEdge)).toBe(1)
    expect(binDetails.totalNumberOfBins).toBe(10)
    expect(binDetails.getBinForValue(maxDate)).toBe(9)

    const numericBinDetails = new BinDetails(0, 14, 2, 0)
    expect(numericBinDetails.getBinForValue(11.99)).toBe(5)
    expect(numericBinDetails.getBinForValue(12)).toBe(6)

    const wideBinDetails = new BinDetails(1e9, 1.5e9 - 0.001, 1e8, 1e9)
    expect(wideBinDetails.totalNumberOfBins).toBe(5)
    expect(wideBinDetails.getBinForValue(1.5e9 - 0.001)).toBe(4)
  })

  it("should put large values exactly on a narrow bin edge in the upper bin", () => {
    const minDate = Date.UTC(2024, 0, 5) / 1000
    const binDetails = new BinDetails(minDate, minDate + 1, 0.2, minDate)
    expect(binDetails.getBinEdge(3)).toBe(minDate + 0.6)
    expect(binDetails.getBinForValue(minDate + 0.6)).toBe(3)
    expect(binDetails.getBinForValue(minDate + 0.59)).toBe(2)
  })

  it("should determine bin for values whose bin value precision is zero", () => {
    const binDetails = new BinDetails(1000, 1500)
    expect(binDetails.binValuePrecision).toBe(0)
    expect(binDetails.getBinForValue(1060)).toBe(0)
    expect(binDetails.getBinForValue(1250)).toBe(2)
  })

  it("should calculate bin midpoints correctly", () => {
    const binDetails = new BinDetails(0, 100, 10, 0)
    expect(binDetails.getBinMidpoint(0)).toBe(5)
    expect(binDetails.getBinMidpoint(1)).toBe(15)
    expect(binDetails.getBinMidpoint(2)).toBe(25)
    expect(binDetails.getBinMidpoint(10)).toBe(105)
  })
})
