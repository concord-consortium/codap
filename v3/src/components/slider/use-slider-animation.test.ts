import { setupSliderAndData } from "./slider-test-utils"
import { playbackStartTestValue } from "./use-slider-animation"

describe("playbackStartTestValue", () => {
  it("doesn't treat a collapsed range one data value before the end as already past it", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    // a3's values are 1..6, so the axis is [1, 6]
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(5, 5)
    // 5 is before the end (6), so playback must not wrap before showing 6
    expect(playbackStartTestValue(slider, 1)).toBeLessThan(slider.valueDomain[1])
    slider.setRange(2, 2)
    expect(playbackStartTestValue(slider, -1)).toBeGreaterThan(slider.valueDomain[0])
  })

  it("keeps the variable slider's start check, which includes its increment", async () => {
    const { slider } = await setupSliderAndData()
    slider.setMultipleOf(2)
    slider.setValue(2)
    expect(playbackStartTestValue(slider, 1)).toBe(4)
  })
})
