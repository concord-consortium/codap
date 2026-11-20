import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IDataSet } from "../../models/data/data-set"
import { setSelectedCases } from "../../models/data/data-set-utils"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { SliderInspector } from "./slider-inspector"
import { setupSliderAndData } from "./slider-test-utils"

describe("SliderInspector", () => {
  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  it("has no Config button while neither range type is available", async () => {
    const { tile } = await setupSliderAndData()
    render(<SliderInspector tile={tile} show={true}/>)
    expect(screen.queryByTestId("slider-config-button")).toBeNull()
    expect(screen.getByTestId("slider-values-button")).toBeInTheDocument()
  })

  it("has a Config button for a range slider while neither range type is available, to switch it back", async () => {
    const { tile, slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    render(<SliderInspector tile={tile} show={true}/>)
    await userEvent.click(screen.getByTestId("slider-config-button"))
    await userEvent.click(screen.getByTestId("slider-type-button"))
    const options = screen.getAllByRole("option").map(option => option.textContent)
    expect(options).toEqual(["Variable", "Visibility"])
  })

  it("puts the Config button first when a range type is available", async () => {
    featureFlagManager.setServerConfig({ selectionSlider: "on" })
    const { tile } = await setupSliderAndData()
    render(<SliderInspector tile={tile} show={true}/>)
    const buttons = screen.getAllByRole("button").map(button => button.getAttribute("data-testid"))
    expect(buttons.slice(0, 3)).toEqual(["slider-config-button", "slider-values-button", "slider-scale-button"])
  })

  it("opens the Configuration palette", async () => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
    const { tile } = await setupSliderAndData()
    render(<SliderInspector tile={tile} show={true}/>)
    await userEvent.click(screen.getByTestId("slider-config-button"))
    expect(screen.getByTestId("slider-type-button")).toBeInTheDocument()
  })

  describe("resuming a paused selection slider", () => {
    // a selection slider bound to a3 at [2, 4] that doesn't own the selection (a3 = 6 is selected)
    async function setupPausedSelectionSlider() {
      featureFlagManager.setServerConfig({ selectionSlider: "on" })
      const setup = await setupSliderAndData()
      const { dataSet, slider } = setup
      slider.setSliderType("selection")
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      slider.setRange(2, 4)
      pauseSlider(dataSet)
      expect(slider.isSelectionPaused).toBe(true)
      return setup
    }
    function pauseSlider(dataSet: IDataSet) {
      const a3 = dataSet.attrFromName("a3")!.id
      act(() => setSelectedCases([dataSet.itemIds.find(itemId => dataSet.getNumeric(itemId, a3) === 6)!], dataSet))
    }
    const selectedA3 = (dataSet: IDataSet) => {
      const a3 = dataSet.attrFromName("a3")!.id
      return dataSet.itemIds.filter(itemId => dataSet.selection.has(itemId))
        .map(itemId => dataSet.getNumeric(itemId, a3)!).sort((x, y) => x - y)
    }
    const palette = () => screen.getByTestId("inspector-palette-slider")

    it.each([
      ["slider-config-button"], ["slider-values-button"], ["slider-scale-button"]
    ])("resumes when %s opens its palette", async (testId) => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      render(<SliderInspector tile={tile} show={true}/>)
      await userEvent.click(screen.getByTestId(testId))
      expect(slider.ownsSelection).toBe(true)
      expect(selectedA3(dataSet)).toEqual([2, 3, 4])
    })

    it("resumes when an inspector button is activated by keyboard", async () => {
      const { tile, slider } = await setupPausedSelectionSlider()
      render(<SliderInspector tile={tile} show={true}/>)
      act(() => screen.getByTestId("slider-values-button").focus())
      await userEvent.keyboard("{Enter}")
      expect(slider.ownsSelection).toBe(true)
    })

    it("resumes on a press within an open palette", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      render(<SliderInspector tile={tile} show={true}/>)
      await userEvent.click(screen.getByTestId("slider-values-button"))
      pauseSlider(dataSet)
      expect(slider.ownsSelection).toBe(false)
      fireEvent.pointerDown(palette(), { button: 0, isPrimary: true })
      expect(slider.ownsSelection).toBe(true)
      expect(selectedA3(dataSet)).toEqual([2, 3, 4])
    })

    it("doesn't resume on a secondary-button press within an open palette", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      render(<SliderInspector tile={tile} show={true}/>)
      await userEvent.click(screen.getByTestId("slider-values-button"))
      pauseSlider(dataSet)
      // JSDom has no PointerEvent, so fireEvent would drop the button; polyfill it from MouseEvent for this event only
      const OriginalPointerEvent = window.PointerEvent
      window.PointerEvent = class extends MouseEvent {} as any
      try {
        fireEvent.pointerDown(palette(), { button: 2 })
        expect(slider.ownsSelection).toBe(false)
        fireEvent.pointerDown(palette(), { button: 0 })
        expect(slider.ownsSelection).toBe(true)
      }
      finally {
        window.PointerEvent = OriginalPointerEvent
      }
    })

    it("resumes on a key within an open palette, but not on Tab or Escape", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      render(<SliderInspector tile={tile} show={true}/>)
      await userEvent.click(screen.getByTestId("slider-values-button"))
      pauseSlider(dataSet)
      fireEvent.keyDown(palette(), { key: "Tab" })
      fireEvent.keyDown(palette(), { key: "Shift" })
      expect(slider.ownsSelection).toBe(false)
      fireEvent.keyDown(palette(), { key: "ArrowDown" })
      expect(slider.ownsSelection).toBe(true)
      pauseSlider(dataSet)
      fireEvent.keyDown(palette(), { key: "Escape" })
      expect(slider.ownsSelection).toBe(false)
    })

    it("leaves the selection alone for a slider that isn't a selection slider", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      act(() => slider.setSliderType("variable"))
      render(<SliderInspector tile={tile} show={true}/>)
      await userEvent.click(screen.getByTestId("slider-values-button"))
      fireEvent.pointerDown(palette(), { button: 0, isPrimary: true })
      expect(selectedA3(dataSet)).toEqual([6])
    })
  })
})
