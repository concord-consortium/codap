import { calculatePointStacking } from "./dot-plot-utils"

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
