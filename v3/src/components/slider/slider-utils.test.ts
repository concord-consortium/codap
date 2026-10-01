import { rangeFromHandles, sliderStep } from "./slider-utils"

describe("rangeFromHandles", () => {
  const step = 0.05

  it("keeps the model's value for the end that isn't moving", () => {
    // React Stately reports the stationary handle rounded to its step grid (4.05 for the model's 4)
    expect(rangeFromHandles([4.05, 6.2], [4, 5], 1, step)).toEqual([4, 6.2])
    expect(rangeFromHandles([3.1, 5.05], [4, 5], 0, step)).toEqual([3.1, 5])
  })

  it("collapses onto the stationary end when the moving handle closes within 1.5 steps", () => {
    expect(rangeFromHandles([4.95, 5], [4, 5], 0, step)).toEqual([5, 5])
    expect(rangeFromHandles([4, 4.07], [4, 5], 1, step)).toEqual([4, 4])
  })

  it("doesn't collapse a handle moving away from a collapsed range", () => {
    // e.g. ArrowRight on the high handle of a zero-width range
    expect(rangeFromHandles([4, 4.05], [4, 4], 1, step)).toEqual([4, 4.05])
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
