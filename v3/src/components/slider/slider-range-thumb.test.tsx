import { act, fireEvent, render, screen } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { TileModelContext } from "../../hooks/use-tile-model-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { ITileModel } from "../../models/tiles/tile-model"
import * as rangeChangeModule from "./slider-range-change"
import { SliderComponent } from "./slider-component"
import { setupSliderAndData } from "./slider-test-utils"

// jsdom has no layout, so the slider is given a width; its axis then has a resolution, and so a keyboard step,
// much smaller than a page
jest.mock("react-resize-detector", () => ({
  useResizeDetector: () => ({ width: 500, height: 100, ref: () => undefined })
}))

const tileSelection: ITileSelection = {
  isTileSelected: () => false,
  selectTile: () => undefined,
  addFocusIgnoreFn: () => () => undefined
}

function renderSlider(tile: ITileModel) {
  const containerRef = { current: document.body }
  return render(
    <DndContext>
      <TileSelectionContext.Provider value={tileSelection}>
        <DocumentContainerContext.Provider value={containerRef}>
          <TileModelContext.Provider value={tile}>
            <SliderComponent tile={tile}/>
          </TileModelContext.Provider>
        </DocumentContainerContext.Provider>
      </TileSelectionContext.Provider>
    </DndContext>
  )
}

describe("SliderRangeThumb keyboard, with a realistic step", () => {
  beforeEach(() => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
  })

  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  // a3 is 1 to 6, so the axis spans 5
  async function setupRange() {
    const result = await setupSliderAndData()
    const { dataSet, slider } = result
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 3)
    renderSlider(result.tile)
    return { ...result, range: screen.getByRole("slider") }
  }

  it("has a step much smaller than a page", async () => {
    const { slider, range } = await setupRange()
    fireEvent.keyDown(range, { key: "ArrowRight" })
    fireEvent.keyUp(range, { key: "ArrowRight" })
    const step = slider.rangeLow - 2
    expect(step).toBeGreaterThan(0)
    const [min, max] = slider.axis.domain
    expect(step).toBeLessThan((max - min) / 20)
  })

  it("moves by a page, a tenth of the axis, with Shift+Arrow", async () => {
    const { slider, range } = await setupRange()
    fireEvent.keyDown(range, { key: "ArrowRight" })
    fireEvent.keyUp(range, { key: "ArrowRight" })
    const step = slider.rangeLow - 2
    act(() => slider.setRange(2, 3))
    fireEvent.keyDown(range, { key: "ArrowRight", shiftKey: true })
    fireEvent.keyUp(range, { key: "ArrowRight" })
    const [min, max] = slider.axis.domain
    // React Stately rounds the page to a multiple of the step
    expect(slider.rangeLow - 2).toBeCloseTo((max - min) / 10, 0)
    expect(Math.abs(slider.rangeLow - 2 - (max - min) / 10)).toBeLessThanOrEqual(step)
    expect(slider.rangeHigh - slider.rangeLow).toBeCloseTo(1)
  })

  it("moves the range live with each keydown of a held key, keeping its width, before the key is released",
      async () => {
    const { slider, range } = await setupRange()
    fireEvent.keyDown(range, { key: "ArrowRight" })
    const first = slider.rangeLow
    expect(first).toBeGreaterThan(2)
    fireEvent.keyDown(range, { key: "ArrowRight", repeat: true })
    expect(slider.rangeLow).toBeGreaterThan(first)
    expect(slider.rangeHigh - slider.rangeLow).toBeCloseTo(1)
    expect(slider.globalValue.isUpdatingDynamically).toBe(true)
    fireEvent.keyUp(range, { key: "ArrowRight" })
    expect(slider.globalValue.isUpdatingDynamically).toBe(false)
  })

  it("commits nothing when the keys move the range away and back", async () => {
    const { slider, range } = await setupRange()
    fireEvent.keyDown(range, { key: "ArrowRight" })
    expect(slider.rangeLow).toBeGreaterThan(2)
    fireEvent.keyDown(range, { key: "ArrowLeft" })
    expect(slider.rangeLow).toBeCloseTo(2, 10)
    const spy = jest.spyOn(rangeChangeModule, "rangeChangeOptions")
    try {
      fireEvent.keyUp(range, { key: "ArrowLeft" })
      fireEvent.keyUp(range, { key: "ArrowRight" })
      expect(spy).not.toHaveBeenCalled()
      expect(slider.globalValue.isUpdatingDynamically).toBe(false)
      expect([slider.rangeLow, slider.rangeHigh]).toEqual([2, 3])
    }
    finally {
      spy.mockRestore()
    }
  })

  it("keeps a held key one change while another key is tapped, and commits when the last range key is released",
      async () => {
    const { slider, range } = await setupRange()
    const spy = jest.spyOn(rangeChangeModule, "rangeChangeOptions")
    try {
      fireEvent.keyDown(range, { key: "ArrowRight" })
      // a key the range ignores
      fireEvent.keyDown(range, { key: "a" })
      fireEvent.keyUp(range, { key: "a" })
      // a range key, tapped while Right is still held
      fireEvent.keyDown(range, { key: "ArrowLeft" })
      fireEvent.keyUp(range, { key: "ArrowLeft" })
      expect(spy).not.toHaveBeenCalled()
      fireEvent.keyDown(range, { key: "ArrowRight", repeat: true })
      fireEvent.keyDown(range, { key: "ArrowRight", repeat: true })
      fireEvent.keyUp(range, { key: "ArrowRight" })
      expect(spy).toHaveBeenCalledTimes(1)
      expect(slider.rangeLow).toBeGreaterThan(2)
    }
    finally {
      spy.mockRestore()
    }
  })
})
