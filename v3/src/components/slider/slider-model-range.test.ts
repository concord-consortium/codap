import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { TreeManager } from "../../models/history/tree-manager"
import { setupSliderAndData } from "./slider-test-utils"
import { rangeFromHandles } from "./slider-utils"

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

  it("narrows the range only while the axis is narrower than it", async () => {
    // configured from a3: range width 0.5 on axis [1, 6]
    const { slider } = await setupRangeSlider()
    // zooming the axis during a drag
    slider.axis.setDynamicDomain(1, 1.2)
    expect(slider.width).toBeCloseTo(0.2)
    slider.axis.setDynamicDomain(1, 6)
    slider.setAxisMax(6)
    expect(slider.width).toBeCloseTo(0.5)
    expect(slider.rangeWidth).toBeCloseTo(0.5)
  })

  it("records no change of its own when an axis drag narrows the range", async () => {
    const { slider } = await setupRangeSlider()
    const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
    const settle = () => when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    appState.document.treeMonitor!.enableMonitoring()
    try {
      await settle()
      const undoLevels = manager.undoStore.undoLevels
      // as an axis drag does: dynamic steps, then the change is committed when the drag ends
      slider.axis.setDynamicDomain(1, 3)
      slider.axis.setDynamicDomain(1, 1.2)
      await settle()
      slider.axis.applyModelChange(() => slider.axis.setDomain(...slider.axis.domain), {
        undoStringKey: "DG.Undo.axisDilate", redoStringKey: "DG.Redo.axisDilate"
      })
      await settle()
      expect(slider.width).toBeCloseTo(0.2)
      expect(manager.undoStore.undoLevels).toBe(undoLevels + 1)

      appState.document.undoLastAction()
      await settle()
      expect(slider.axis.domain).toEqual([1, 6])
      expect(slider.width).toBeCloseTo(0.5)
    }
    finally {
      appState.document.treeMonitor!.disableMonitoring()
    }
  })

  it("keeps the range where it was when the axis is zoomed in and back out", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(3, 4)
    // a zoom that leaves no room for the range at its low end
    slider.axis.setDynamicDomain(1, 2)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([1, 2])
    slider.axis.setDynamicDomain(1, 6)
    slider.axis.setDomain(1, 6)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([3, 4])
    expect(slider.value).toBe(3)
    expect(slider.globalValue.dynamicValue).toBeUndefined()
  })

  it("saves where the range fits when an axis drag ends zoomed in, as part of the axis change", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(3, 4)
    const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
    const settle = () => when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    await settle()
    const undoLevels = manager.undoStore.undoLevels
    // the low end is still inside the zoomed axis, but must move to leave room for the width
    slider.axis.setDynamicDomain(1, 3.5)
    await settle()
    slider.axis.applyModelChange(() => slider.axis.setDomain(...slider.axis.domain), {
      undoStringKey: "DG.Undo.axisDilate", redoStringKey: "DG.Redo.axisDilate"
    })
    await settle()
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([2.5, 3.5])
    expect(slider.globalValue.value).toBe(2.5)
    expect(slider.globalValue.dynamicValue).toBeUndefined()
    expect(manager.undoStore.undoLevels).toBe(undoLevels + 1)

    appState.document.undoLastAction()
    await settle()
    expect(slider.axis.domain).toEqual([1, 6])
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([3, 4])
  })

  it("keeps the saved width when the range is moved while the axis is zoomed in", async () => {
    const { slider } = await setupRangeSlider()
    slider.setRange(1, 4)
    slider.axis.setDynamicDomain(1, 2)
    slider.moveRange(1)
    expect(slider.rangeWidth).toBe(3)
  })

  it("ignores the multiple restriction for range bounds", async () => {
    const { slider } = await setupRangeSlider()
    slider.setMultipleOf(2)
    slider.setRange(1.5, 3.5)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([1.5, 3.5])
  })

  it("undoes a drag's dynamic steps and committed range change in one step", async () => {
    const { slider } = await setupRangeSlider()
    const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
    appState.document.treeMonitor!.enableMonitoring()
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })

    // as a drag does: dynamic steps, then the range is committed when the drag ends
    slider.setDynamicRange(1.5, 3)
    slider.setDynamicRange(2, 4)
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

describe("SliderModel range collapsed by a handle drag", () => {
  // as the component does: each move combines the reported handles with the range when the press began, and
  // the release commits the same way
  async function dragHighHandle(start: [number, number], moves: number[]) {
    const setup = await setupRangeSlider()
    const { slider } = setup
    slider.setRange(...start)
    const step = 0.05
    const rangeFor = (high: number) =>
      rangeFromHandles([slider.rangeLow, high], [slider.rangeLow, slider.rangeHigh], 1, step, start)
    moves.forEach(high => slider.setDynamicRange(...rangeFor(high)))
    slider.setRange(...rangeFor(moves[moves.length - 1]))
    return setup
  }

  it("stays collapsed when the snap to the data moves it away from where the drag left it", async () => {
    // a3's values are 1..6, so a collapse at 4.4 snaps to 4, which is more than 3 steps away
    const { slider } = await dragHighHandle([4.4, 5.5], [5, 4.6, 4.5])
    expect(slider.width).toBe(0)
    expect(slider.rangeLow).toBe(4)
  })

  it("returns the low end to where the user left it when the drag goes back out", async () => {
    const { slider } = await dragHighHandle([4.4, 5.5], [4.5, 5])
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([4.4, 5])
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

  it("steps a range with width by the fallback step, ignoring the multiple restriction as a drag does", async () => {
    const { slider } = await setupRangeSlider()
    slider.setMultipleOf(2)
    slider.setRange(2, 3)
    expect(slider.nextAnimationValue(1, 0.25)).toBeCloseTo(2.25)
  })

  it("steps a variable slider by its multiple restriction", async () => {
    const { slider } = await setupSliderAndData()
    slider.setMultipleOf(2)
    slider.setValue(2)
    expect(slider.nextAnimationValue(1, 0.25)).toBe(4)
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

describe("SliderModel snapping within the axis", () => {
  it("snaps only to data values inside the axis", async () => {
    const { slider } = await setupRangeSlider()
    slider.setAxisMin(2.5)
    slider.setAxisMax(4.5)
    // the nearest data value to 2.5 overall is 2 (a tie with 3), but 2 is outside the axis
    slider.setRange(2.5, 2.5)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([3, 3])
  })

  it("keeps the clamped value when no data value lies inside the axis", async () => {
    const { slider } = await setupRangeSlider()
    slider.setAxisMin(2.2)
    slider.setAxisMax(2.8)
    slider.setRange(2.5, 2.5)
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([2.5, 2.5])
  })
})
