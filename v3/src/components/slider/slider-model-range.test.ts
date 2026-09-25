import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { TreeManager } from "../../models/history/tree-manager"
import { setupSliderAndData } from "./slider-test-utils"

// the standard test dataset's a3 values are 1..6, so configuring from a3 gives axis [1, 6] and range [1, 1.5]
async function setupRangeSlider() {
  const setup = await setupSliderAndData()
  setup.slider.configureFromAttribute(setup.dataSet, setup.dataSet.attrFromName("a3")!.id)
  return setup
}

describe("SliderModel range", () => {
  it("stores the range as the value (low end) plus a width", async () => {
    const { slider } = await setupRangeSlider()
    expect(slider.isRangeSlider).toBe(true)
    expect(slider.rangeLow).toBe(1)
    expect(slider.value).toBe(1)
    expect(slider.width).toBeCloseTo(0.5)
    expect(slider.rangeHigh).toBeCloseTo(1.5)
    expect(slider.valueDomain[0]).toBe(1)
    expect(slider.valueDomain[1]).toBeCloseTo(5.5)
  })

  it("resizes with setRange, clamping to the axis and keeping low <= high", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(2, 4)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([2, 4])
    slider.setRange(0, 9)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([1, 6])
    slider.setRange(5, 3)
    expect(slider.rangeHigh).toBeGreaterThanOrEqual(slider.rangeLow)
  })

  it("snaps a zero-width range to a value present in the data", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(3.4, 3.4)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([3, 3])
    slider.setDynamicRange(4.6, 4.6)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([5, 5])
  })

  it("moves the whole range keeping its width, stopping at the axis ends", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(2, 3)
    slider.moveRange(4)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([4, 5])
    slider.moveRange(10)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([5, 6])
    slider.moveRange(-10)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([1, 2])
  })

  it("updates dynamically during a drag and commits once at the end", async () => {
    const { slider } = await setupRangeSlider()
    slider.setDynamicRange(2, 4)
    expect(slider.isUpdatingDynamically).toBe(true)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([2, 4])
    expect(slider.rangeWidth).toBeCloseTo(0.5)   // not yet committed
    slider.setRange(2, 4)
    expect(slider.isUpdatingDynamically).toBe(false)
    expect(slider.rangeWidth).toBe(2)
    expect(slider.dynamicRangeWidth).toBeUndefined()
  })

  it("keeps the range within the axis when the axis bounds change", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(4, 5)
    slider.setAxisMax(4.5)
    expect(slider.rangeHigh).toBeLessThanOrEqual(4.5)
    expect(slider.width).toBe(1)
    slider.setAxisMin(4)
    // the axis is now narrower than the range, so the width shrinks to fit it
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([4, 4.5])
  })

  it("ignores the multiple restriction for range bounds", async () => {
    const { slider } = await setupRangeSlider()
    slider.setMultipleOf(2)
    slider.setRange(1.5, 3.5)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([1.5, 3.5])
  })

  it("undoes a committed range change in one step", async () => {
    const { slider } = await setupRangeSlider()
    const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
    appState.document.treeMonitor!.enableMonitoring()
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })

    slider.applyModelChange(() => slider.setRange(2, 4), {
      undoStringKey: "V3.Undo.slider.changeRange", redoStringKey: "V3.Redo.slider.changeRange"
    })
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([2, 4])

    appState.document.undoLastAction()
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    expect(slider.rangeLow).toBe(1)
    expect(slider.rangeHigh).toBeCloseTo(1.5)
    appState.document.treeMonitor!.disableMonitoring()
  })

  it("leaves a variable slider's value handling unchanged", async () => {
    const { slider } = await setupSliderAndData()
    expect(slider.isRangeSlider).toBe(false)
    expect(slider.valueDomain).toEqual(slider.axis.domain)
    slider.setMultipleOf(2)
    slider.setValue(2.5)
    expect(slider.value).toBe(2)
  })
})

describe("SliderModel playback steps", () => {
  it("steps a zero-width range through the distinct data values", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(3, 3)
    expect(slider.nextAnimationValue(1, 0.1)).toBe(4)
    expect(slider.nextAnimationValue(-1, 0.1)).toBe(2)
    slider.setRange(6, 6)
    // past the last value: beyond the domain, so the animation's aboveMax handler wraps or stops
    expect(slider.nextAnimationValue(1, 0.1)).toBeGreaterThan(slider.valueDomain[1])
  })

  it("steps other sliders by the increment", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(2, 3)
    expect(slider.nextAnimationValue(1, 0.25)).toBeCloseTo(2.25)
  })
})

describe("SliderModel playback bounds", () => {
  it("reaches the high end of the value domain when a range with width plays forward", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(5, 5.5)
    const aboveMax = jest.fn((value: number) => value)
    const belowMin = jest.fn((value: number) => value)
    // one playback tick past the end of the value domain [1, 5.5], by an increment smaller than the width
    slider.validateValue(slider.nextAnimationValue(1, 0.6), belowMin, aboveMax)
    expect(aboveMax).toHaveBeenCalled()
  })
})
