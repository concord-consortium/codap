import { durationUnitSeconds } from "../../utilities/date-utils"
import {
  formatSliderWidth, getSliderWidthUnitChoices, rangeFromHandles, sliderStep
} from "./slider-utils"

describe("rangeFromHandles", () => {
  const step = 0.05

  it("keeps the model's value for the end that isn't moving", () => {
    // React Stately reports the stationary handle rounded to its step grid (4.05 for the model's 4)
    expect(rangeFromHandles([4.05, 6.2], [4, 5], 1, step)).toEqual([4, 6.2])
    expect(rangeFromHandles([3.1, 5.05], [4, 5], 0, step)).toEqual([3.1, 5])
  })

  it("collapses onto the stationary end when the moving handle closes within 3 steps", () => {
    expect(rangeFromHandles([4.95, 5], [4, 5], 0, step)).toEqual([5, 5])
    expect(rangeFromHandles([4, 4.07], [4, 5], 1, step)).toEqual([4, 4])
  })

  it("doesn't collapse a handle moving away from a collapsed range", () => {
    // e.g. ArrowRight on the high handle of a zero-width range
    expect(rangeFromHandles([4, 4.05], [4, 4], 1, step)).toEqual([4, 4.05])
  })

  it("collapses within 3 steps, judged against the range when the press began", () => {
    // e.g. the release reports a handle a step away from the collapsed range the drag produced
    expect(rangeFromHandles([4, 4.05], [4, 4], 1, step, [4, 5])).toEqual([4, 4])
    // 2.8 steps from the other end collapses; 4 steps doesn't
    expect(rangeFromHandles([4, 4.14], [4, 4.5], 1, step, [4, 5])).toEqual([4, 4])
    expect(rangeFromHandles([4, 4.2], [4, 4.5], 1, step, [4, 5])).toEqual([4, 4.2])
  })

  it("keeps the stationary end where the press began, even after the model snapped a collapse to the data", () => {
    // the drag collapsed [4, 5] onto 4, which the model snapped to a data value of 3; the handle reports 4.1
    expect(rangeFromHandles([3, 4.1], [3, 3], 1, step, [4, 5])).toEqual([4, 4])
    // dragging back out in the same press returns the low end to where the user left it
    expect(rangeFromHandles([3, 4.5], [3, 3], 1, step, [4, 5])).toEqual([4, 4.5])
  })

  it("widens a collapsed range when a press moves a handle away from it", () => {
    // e.g. ArrowRight on the high handle of a zero-width range: the press began collapsed
    expect(rangeFromHandles([4, 4.05], [4, 4], 1, step, [4, 4])).toEqual([4, 4.05])
  })

  it("uses both reported values when no handle is known to be moving", () => {
    expect(rangeFromHandles([2, 3], [4, 5], undefined, step)).toEqual([2, 3])
  })
})

describe("sliderStep", () => {
  const resolution = 0.02

  it("uses the pixel resolution for range sliders, whatever the multiples restriction or date unit", () => {
    expect(sliderStep({ isRangeSlider: true, scaleType: "numeric", multipleOf: 5 }, resolution)).toBe(0.02)
    expect(sliderStep({ isRangeSlider: true, scaleType: "date", dateMultipleOfUnit: "day" }, resolution))
      .toBe(0.02)
  })

  it("keeps the variable slider's step", () => {
    expect(sliderStep({ isRangeSlider: false, scaleType: "numeric", multipleOf: 5 }, resolution)).toBe(5)
    expect(sliderStep({ isRangeSlider: false, scaleType: "numeric" }, resolution)).toBe(0.02)
    expect(sliderStep({ isRangeSlider: false, scaleType: "date", dateMultipleOfUnit: "day" }, resolution))
      .toBe(86400)
  })
})

describe("getSliderWidthUnitChoices", () => {
  const [year, month, week, day, hour, minute] =
    (["year", "month", "week", "day", "hour", "minute"] as const).map(durationUnitSeconds)

  it("offers the largest unit the span holds at least one of, then the next two smaller", () => {
    expect(getSliderWidthUnitChoices(3 * year)).toEqual(["year", "month", "week"])
    expect(getSliderWidthUnitChoices(year)).toEqual(["year", "month", "week"])
    expect(getSliderWidthUnitChoices(year - 1)).toEqual(["month", "week", "day"])
    expect(getSliderWidthUnitChoices(month)).toEqual(["month", "week", "day"])
    expect(getSliderWidthUnitChoices(month - 1)).toEqual(["week", "day", "hour"])
    expect(getSliderWidthUnitChoices(week)).toEqual(["week", "day", "hour"])
    expect(getSliderWidthUnitChoices(week - 1)).toEqual(["day", "hour", "minute"])
    expect(getSliderWidthUnitChoices(day)).toEqual(["day", "hour", "minute"])
    expect(getSliderWidthUnitChoices(day - 1)).toEqual(["hour", "minute", "second"])
    expect(getSliderWidthUnitChoices(hour)).toEqual(["hour", "minute", "second"])
  })

  it("still offers three units when the span is under an hour or empty", () => {
    expect(getSliderWidthUnitChoices(minute)).toEqual(["hour", "minute", "second"])
    expect(getSliderWidthUnitChoices(0)).toEqual(["hour", "minute", "second"])
  })

})

describe("formatSliderWidth", () => {
  it("shows two significant digits", () => {
    expect(formatSliderWidth(1.4286)).toBe("1.4")
    expect(formatSliderWidth(0.04286)).toBe("0.043")
    expect(formatSliderWidth(2)).toBe("2")
  })

  it("never rounds away integer digits", () => {
    expect(formatSliderWidth(365)).toBe("365")
    expect(formatSliderWidth(156.4)).toBe("156")
  })

  it("shows zero as 0", () => {
    expect(formatSliderWidth(0)).toBe("0")
  })

  it("handles widths with more than 100 integer digits", () => {
    expect(formatSliderWidth(1e100)).toBe("1e+100")
    expect(formatSliderWidth(1e150)).toBe("1e+150")
  })
})
