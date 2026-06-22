import { setNiceDomain } from "./axis-domain-utils"
import { NumericAxisModel } from "./models/numeric-axis-models"

describe("setNiceDomain", () => {
  it("does nothing when given empty values", () => {
    const axis = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    setNiceDomain([], axis)
    expect(axis.min).toBe(0)
    expect(axis.max).toBe(10)
  })

  it("preserves bounds when data fits within them (CODAP-1421)", () => {
    const axis = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    setNiceDomain([1, 5, 9], axis)
    expect(axis.min).toBe(0)
    expect(axis.max).toBe(10)
  })

  it("expands bounds when data extends beyond the current upper bound", () => {
    const axis = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    setNiceDomain([1, 15], axis)
    expect(axis.min).toBe(0)
    expect(axis.max).toBeGreaterThanOrEqual(15)
  })

  it("recomputes bounds when allowRangeToShrink is set (autoScale path)", () => {
    const axis = NumericAxisModel.create({ place: "bottom", min: 0, max: 100 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([3, 7], axis)
    // Bounds should have tightened around the data.
    expect(axis.max).toBeLessThan(100)
  })

  it("recomputes bounds when clampPosMinAtZero option is set", () => {
    const axis = NumericAxisModel.create({ place: "bottom", min: 0, max: 100 })
    setNiceDomain([3, 7], axis, { clampPosMinAtZero: true })
    // Bounds should have been recomputed (the data-fits early return is skipped for clamping).
    expect(axis.min).toBe(0)
    expect(axis.max).toBeLessThan(100)
  })
})
