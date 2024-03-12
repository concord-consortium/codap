import { calculatePointStacking, determineBinForCase } from "./dot-plot-utils"

describe("determineBinForCase", () => {
  it("returns the bin number for a given case value in a binned dot plot", () => {
    const caseValue = 25
    const binWidth = 10
    const binNumber = determineBinForCase(caseValue, binWidth)
    expect(binNumber).toEqual(3)
  })
})

describe("calculatePointStacking", () => {
  it("returns the max number of points per stack and number of stacks needed to fit all points in a cell", () => {
    const numberOfPoints = 9
    const pointDiameter = 12
    const cellBoundary = 100
    const { maxPointsPerStack, numberOfStacks } = calculatePointStacking(numberOfPoints, pointDiameter, cellBoundary)
    expect(maxPointsPerStack).toEqual(8)
    expect(numberOfStacks).toEqual(2)
  })
})
