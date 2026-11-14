import { setNiceDomain } from "./axis-domain-utils"
import { DateAxisModel, NumericAxisModel } from "./models/numeric-axis-models"

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

  it("does not shrink a clamped axis when growOnly is set and the data already fits", () => {
    const axis = NumericAxisModel.create({ place: "bottom", min: 0, max: 100 })
    setNiceDomain([3, 7], axis, { clampPosMinAtZero: true, growOnly: true })
    // Grow-only: a larger user/plugin-set bound survives rather than being refit tightly.
    expect(axis.min).toBe(0)
    expect(axis.max).toBe(100)
  })

  it("still grows a clamped axis when growOnly is set and the data exceeds the current max", () => {
    const axis = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    setNiceDomain([3, 50], axis, { clampPosMinAtZero: true, growOnly: true })
    expect(axis.min).toBe(0)
    expect(axis.max).toBeGreaterThanOrEqual(50)
  })
})

describe("setNiceDomain on a date axis", () => {
  const kNowSecs = 1762862400 // 11 November 2025 12:00 UTC
  const kDay = 24 * 60 * 60
  const kFiveDays = 5 * kDay
  const kTenDays = 10 * kDay

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(kNowSecs * 1000)
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("shows the ten days ending now when there are no dates", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([], axis)
    expect(axis.domain).toEqual([kNowSecs - kTenDays, kNowSecs])
  })

  it("fits the first dates to arrive after the no-dates range, even in a grow-only refit", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([], axis)
    // 1, 15 and 31 January 2024 00:00 UTC; the 10% pad of their 30-day span is 3 days
    setNiceDomain([1704067200, 1705276800, 1706659200], axis, { growOnly: true })
    expect(axis.domain).toEqual([1703808000, 1706918400])
  })

  it("leaves the axis alone when a grow-only refit has no dates", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 100000, max: 200000 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([], axis, { growOnly: true })
    expect(axis.domain).toEqual([100000, 200000])
  })

  it("leaves the axis alone when a refit that may not shrink it has no dates", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 100000, max: 200000 })
    setNiceDomain([], axis)
    expect(axis.domain).toEqual([100000, 200000])
  })

  it("centers the axis on the date, five days each way, when every date is the same", () => {
    const date = 1704067200 // 1 January 2024 00:00 UTC
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([date, date, date], axis)
    expect(axis.domain).toEqual([date - kFiveDays, date + kFiveDays])
  })

  it("pads distinct dates by a tenth of their span on each side", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([1000000, 1100000, 2000000], axis)
    expect(axis.domain).toEqual([900000, 2100000])
  })
})
