import {ptInRect} from "../../data-display/data-display-utils"
import { GraphLayout } from "../models/graph-layout"
import {
  equationString, formatValue, kMinus, lineToAxisIntercepts, lsrlEquationString, valueLabelString
} from "./graph-utils"

describe("formatValue", () => {
  it("should format values correctly", () => {
    expect(formatValue(0, 1)).toBe("0")
    expect(formatValue(-0, 1)).toBe("0")
    expect(formatValue(0/0, 2)).toBe("(not a number)")
    expect(formatValue(1/0, 2)).toBe("∞")
    expect(formatValue(-1/0, 2)).toBe(`${kMinus}∞`)
    expect(formatValue(123.456, 2)).toBe("123.46")
    expect(formatValue(1.00, 2)).toBe("1")
    expect(formatValue(-0.00000018, 8)).toBe(`${kMinus}1.8e${kMinus}7`)
    expect(formatValue(123400.5, 1)).toBe("123,400.5")
    expect(formatValue(1234567, 2)).toBe("1,234,567")
    expect(formatValue(1230000, 2)).toBe("1.23e6")
    expect(formatValue(123000, 2)).toBe("1.23e5")
    expect(formatValue(500000, 2)).toBe("5e5")
  })
})

describe("equationString", () => {
  const layout = new GraphLayout()
  const attrNames = {x: "Lifespan", y: "Speed"}
  const units = {}
  it("should return a valid equation for a given slope and intercept", () => {
    expect(equationString({slope: 1, intercept: 0, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1 (<em>Lifespan</em>)')
  })
  it("should return an equation containing only the y attribute when the slope is 0", () => {
    expect(equationString({slope: 0, intercept: 1, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1')
  })
  it("should return an equation containing only the x attribute when the slope is Infinity", () => {
    expect(equationString({slope: Infinity, intercept: 1, attrNames, units, layout}))
      .toBe('<em>Lifespan</em> = 1')
  })
})

describe("lsrlEquationString", () => {
  const layout = new GraphLayout()
  const attrNames = {x: "Lifespan", y: "Speed"}
  const units = {}
  it("should return a valid equation for a given slope and intercept", () => {
    expect(lsrlEquationString({caseValues: [], slope: 1, intercept: 0, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1 (<em>Lifespan</em>)')
  })
  it("should return an equation containing only the y attribute when the slope is 0", () => {
    expect(lsrlEquationString({caseValues: [], slope: 0, intercept: 1, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1')
  })
  it("should return an equation containing only the x attribute when the slope is Infinity", () => {
    expect(lsrlEquationString({caseValues: [], slope: Infinity, intercept: 1, attrNames, units, layout}))
      .toBe('<em>Lifespan</em> = 1')
  })
  it("should not show r or r² when both showR and showRSquared are false", () => {
    const result = lsrlEquationString({
      caseValues: [], slope: 1, intercept: 0, rSquared: 0.5, attrNames, units, layout,
      showR: false, showRSquared: false
    })
    expect(result).not.toContain("r<sup>2</sup>")
    expect(result).not.toContain("r =")
  })
  it("should show r when showR is true", () => {
    const result = lsrlEquationString({
      caseValues: [], slope: 1, intercept: 0, rSquared: 0.25, attrNames, units, layout,
      showR: true, showRSquared: false
    })
    expect(result).toContain("r = 0.5")
    expect(result).not.toContain("r<sup>2</sup>")
  })
  it("should show negative r for negative slope", () => {
    const result = lsrlEquationString({
      caseValues: [], slope: -2, intercept: 5, rSquared: 0.25, attrNames, units, layout,
      showR: true, showRSquared: false
    })
    expect(result).toContain(`r = ${kMinus}0.5`)
  })
  it("should show r² when showRSquared is true", () => {
    const result = lsrlEquationString({
      caseValues: [], slope: 1, intercept: 0, rSquared: 0.5, attrNames, units, layout,
      showR: false, showRSquared: true
    })
    expect(result).toContain("r<sup>2</sup> = 0.5")
    expect(result).not.toContain("<br />r =")
  })
  it("should show both r and r² when both are true", () => {
    const result = lsrlEquationString({
      caseValues: [], slope: 1, intercept: 0, rSquared: 0.25, attrNames, units, layout,
      showR: true, showRSquared: true
    })
    expect(result).toContain("r = 0.5")
    expect(result).toContain("r<sup>2</sup> = 0.25")
  })
  it("should not show r or r² when interceptLocked is true", () => {
    const result = lsrlEquationString({
      caseValues: [], slope: 1, intercept: 0, rSquared: 0.25, attrNames, units, layout,
      showR: true, showRSquared: true, interceptLocked: true
    })
    expect(result).not.toContain("r =")
    expect(result).not.toContain("r<sup>2</sup>")
  })
})

describe("valueLabelString", () => {
  it("should give correct string", () => {
    expect(valueLabelString(1 / 3)).toBe('0.3333')
  })
})

describe("ptInRect", () => {
  it("{x: 0, y: 0} should be in {x:-1, y: -1, width: 2, height: 2}", () => {
    expect(ptInRect({x: 0, y: 0}, {x: -1, y: -1, width: 2, height: 2})).toBe(true)
  })

  it("{x: 0, y: 0} should be in {x:0, y: 0, width: 0, height: 0}", () => {
    expect(ptInRect({x: 0, y: 0}, {x: 0, y: 0, width: 0, height: 0})).toBe(true)
  })

  it("{x: 1, y: 1} should not be in {x:0, y: 0, width: 1, height: 0.999}", () => {
    expect(ptInRect({x: 1, y: 1}, {x: 0, y: 0, width: 1, height: 0.999})).toBe(false)
  })
})

describe("lineToAxisIntercepts", () => {
  it("Line with slope 1 and intercept 0 should intercept (0,0),(1,1)", () => {
    expect(lineToAxisIntercepts(1, 0, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0, y: 0}, pt2: {x: 1, y: 1}})
  })

  it("Line with slope ∞ and intercept 0.5 should be parallel to y-axis going through x=0.5", () => {
    expect(lineToAxisIntercepts(1 / 0, 0.5, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0.5, y: 0}, pt2: {x: 0.5, y: 1}})
  })

  it("Line with slope -1 and intercept 1 should intercept (0,1),(1,0)", () => {
    expect(lineToAxisIntercepts(-1, 1, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0, y: 1}, pt2: {x: 1, y: 0}})
  })

  it("Line with slope -1 and intercept 0 should hit the lower-left corner of (0,1),(1,0)", () => {
    expect(lineToAxisIntercepts(-1, 0, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0, y: 0}, pt2: {x: -0, y: 0}})
  })

  it("Line with slope 1 and intercept -1 should hit the lower-right corner of (0,1),(1,0)", () => {
    expect(lineToAxisIntercepts(1, -1, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 1, y: 0}, pt2: {x: 1, y: 0}})
  })

  it("Line with slope 1 and intercept -2 should not intersect (0,1),(1,0)", () => {
    const xDomain = [0, 1],
      yDomain = [0, 1],
      rect = {x: 0, y: 1, width: 1, height: 1},
      result = lineToAxisIntercepts(1, -2, xDomain, yDomain)
    expect(ptInRect(result.pt1, rect) || ptInRect(result.pt2, rect))
      .toBe(false)
  })

})
