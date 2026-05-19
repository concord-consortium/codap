import {ptInRect} from "../../data-display/data-display-utils"
import { GraphLayout } from "../models/graph-layout"
import {
  dateTimeSlopeUnit, equationString, formatDateDuration, formatValue, kMinus, lineToAxisIntercepts,
  lsrlEquationString, valueLabelString
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
  it("should omit the intercept when it rounds to zero", () => {
    expect(equationString({slope: 1, intercept: 0.0001, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1 (<em>Lifespan</em>)')
    expect(equationString({slope: 1, intercept: -0.0001, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1 (<em>Lifespan</em>)')
  })

  // x-axis range expressed in seconds (since V3 stores date values as epoch seconds).
  const oneHour = 3600
  const oneDay = 86400
  const oneYear = 86400 * 365.25

  describe("date-time x-axis", () => {
    // When the x-axis is date-time, the equation should show only the scaled slope with a
    // sensible per-{time-unit} label — never the meaningless intercept (= y at the Unix epoch).
    it("uses seconds when range < 120s", () => {
      const result = equationString({
        slope: 0.5, intercept: 100, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, 60]
      })
      expect(result).toBe(
        '<em>slope</em> = 0.5 <span class="units">°C</span> <span class="units">per second</span>')
      expect(result).not.toContain("Lifespan")
    })
    it("uses minutes when range < 2 hours", () => {
      // 0.001 °C/sec × 60 = 0.06 °C/min
      const result = equationString({
        slope: 0.001, intercept: 0, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, oneHour]
      })
      expect(result).toContain('= 0.06 <span class="units">°C</span>')
      expect(result).toContain('per minute')
    })
    it("uses hours when range < 2 days", () => {
      // 1e-5 °C/sec × 3600 = 0.036 °C/hour
      const result = equationString({
        slope: 1e-5, intercept: 0, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, oneDay]
      })
      expect(result).toContain('= 0.036 <span class="units">°C</span>')
      expect(result).toContain('per hour')
    })
    it("uses days when range < 365 days", () => {
      // 1e-6 °C/sec × 86400 = 0.0864 °C/day
      const result = equationString({
        slope: 1e-6, intercept: 0, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, oneDay * 30]
      })
      expect(result).toContain('= 0.0864 <span class="units">°C</span>')
      expect(result).toContain('per day')
    })
    it("uses years when range >= 365 days", () => {
      // 1e-8 °C/sec × (86400 × 365.25) ≈ 0.316 °C/year
      const result = equationString({
        slope: 1e-8, intercept: 0, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, oneYear * 5]
      })
      expect(result).toContain('per year')
    })
    it("omits the y-unit when scaled slope rounds to 0", () => {
      const result = equationString({
        slope: 0, intercept: 100, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, oneDay * 30]
      })
      expect(result).toBe('<em>slope</em> = 0 <span class="units">per day</span>')
    })
    it("omits the y-unit span when y has no units", () => {
      const result = equationString({
        slope: 1e-6, intercept: 0, attrNames, units: {}, layout,
        xIsDateTime: true, xAxisRange: [0, oneDay * 30]
      })
      expect(result).toBe('<em>slope</em> = 0.0864 <span class="units">per day</span>')
    })
    it("appends sum-of-squares when provided", () => {
      const result = equationString({
        slope: 1e-6, intercept: 0, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, oneDay * 30], sumOfSquares: 42
      })
      expect(result).toContain('per day')
      expect(result).toContain('Sum of squares = 42')
    })
    it("falls through to standard form when xIsDateTime is false", () => {
      const result = equationString({
        slope: 1, intercept: 0, attrNames, units, layout,
        xAxisRange: [0, oneDay]
      })
      expect(result).toBe('<em>Speed</em> = 1 (<em>Lifespan</em>)')
    })
  })
})

describe("dateTimeSlopeUnit", () => {
  it("selects unit by x-axis range in seconds", () => {
    expect(dateTimeSlopeUnit(60).label).toMatch(/second/)
    expect(dateTimeSlopeUnit(60).multiplier).toBe(1)
    expect(dateTimeSlopeUnit(3600).label).toMatch(/minute/)
    expect(dateTimeSlopeUnit(3600).multiplier).toBe(60)
    expect(dateTimeSlopeUnit(86400).label).toMatch(/hour/)
    expect(dateTimeSlopeUnit(86400).multiplier).toBe(3600)
    expect(dateTimeSlopeUnit(86400 * 30).label).toMatch(/day/)
    expect(dateTimeSlopeUnit(86400 * 30).multiplier).toBe(86400)
    expect(dateTimeSlopeUnit(86400 * 365 * 5).label).toMatch(/year/)
    expect(dateTimeSlopeUnit(86400 * 365 * 5).multiplier).toBeCloseTo(86400 * 365.25)
  })
})

describe("formatDateDuration", () => {
  it("selects unit by x-axis range and scales the duration accordingly", () => {
    expect(formatDateDuration(30, 60)).toMatch(/^30 seconds?$/)
    expect(formatDateDuration(600, 3600)).toMatch(/^10 minutes?$/)
    expect(formatDateDuration(7200, 86400)).toMatch(/^2 hours?$/)
    expect(formatDateDuration(86400 * 30, 86400 * 30)).toMatch(/^30 days?$/)
    expect(formatDateDuration(86400 * 365 * 5, 86400 * 365 * 5)).toMatch(/^5 years?$/)
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
  it("should omit the intercept when it rounds to zero", () => {
    expect(lsrlEquationString({caseValues: [], slope: 1, intercept: 0.0001, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1 (<em>Lifespan</em>)')
    expect(lsrlEquationString({caseValues: [], slope: 1, intercept: -0.0001, attrNames, units, layout}))
      .toBe('<em>Speed</em> = 1 (<em>Lifespan</em>)')
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

  describe("date-time x-axis", () => {
    const oneDay = 86400
    it("uses slope-only form and still appends r² and sum-of-squares", () => {
      const result = lsrlEquationString({
        caseValues: [], slope: 1e-6, intercept: 12345, attrNames, units: { y: "°C" }, layout,
        xIsDateTime: true, xAxisRange: [0, oneDay * 30],
        rSquared: 0.25, showR: false, showRSquared: true, sumOfSquares: 7
      })
      // Slope-only form for the leading equation — no Speed/Lifespan and no intercept.
      expect(result).toContain('<em>slope</em> = 0.0864 <span class="units">°C</span>')
      expect(result).toContain('per day')
      expect(result).not.toContain("Speed")
      expect(result).not.toContain("Lifespan")
      expect(result).not.toContain("12345")
      // Trailing statistics still appended.
      expect(result).toContain("r<sup>2</sup> = 0.25")
      expect(result).toContain("Sum of squares = 7")
    })
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
