import { buildResidualPositions, clampRectToLowerRegion } from "./residual-marquee-utils"

describe("buildResidualPositions", () => {
  it("maps each residual to screen coords y = plotHeight + lowerScale(residual)", () => {
    const residuals = [{ caseID: "a", x: 1, residual: 2 }, { caseID: "b", x: 3, residual: -1 }]
    const getXCoord = (id: string) => (id === "a" ? 10 : 30)
    const lowerScale = (r: number) => r * 5 // stand-in linear scale
    const positions = buildResidualPositions(residuals, getXCoord, 100, lowerScale)
    expect(positions).toEqual([
      { caseID: "a", x: 10, y: 110 },
      { caseID: "b", x: 30, y: 95 }
    ])
  })

  it("drops points with non-finite coordinates", () => {
    const residuals = [{ caseID: "a", x: NaN, residual: 2 }]
    const positions = buildResidualPositions(residuals, () => NaN, 100, (r) => r)
    expect(positions).toEqual([])
  })
})

describe("clampRectToLowerRegion", () => {
  const region = { top: 100, bottom: 160, right: 200 }

  it("clamps a rect that overflows the region to the region bounds", () => {
    const clamped = clampRectToLowerRegion({ x: -20, y: 40, w: 300, h: 200 }, region)
    expect(clamped).toEqual({ x: 0, y: 100, w: 200, h: 60 })
  })

  it("leaves an already-contained rect unchanged", () => {
    const clamped = clampRectToLowerRegion({ x: 10, y: 110, w: 50, h: 20 }, region)
    expect(clamped).toEqual({ x: 10, y: 110, w: 50, h: 20 })
  })
})
