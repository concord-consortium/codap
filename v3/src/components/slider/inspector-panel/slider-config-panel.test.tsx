import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { appState } from "../../../models/app-state"
import { featureFlagManager } from "../../../models/feature-flags/feature-flag-manager"
import { TreeManager } from "../../../models/history/tree-manager"
import { getTitle } from "../../../models/tiles/tile-content-info"
import { ISliderModel } from "../slider-model"
import { setupSliderAndData } from "../slider-test-utils"
import { durationUnitSeconds } from "../../../utilities/date-utils"
import { SliderConfigPalette } from "./slider-config-panel"

const [year, week, day] = (["year", "week", "day"] as const).map(durationUnitSeconds)

function renderPalette(slider: ISliderModel) {
  return render(<SliderConfigPalette sliderModel={slider} setShowPalette={jest.fn()}/>)
}

// runs the test body with undo history recorded, passing a function that waits for pending entries to complete
async function withHistory(body: (settle: () => Promise<void>) => Promise<void>) {
  const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
  const settle = () => when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
  appState.document.treeMonitor!.enableMonitoring()
  try {
    await settle()
    await body(settle)
  }
  finally {
    appState.document.treeMonitor!.disableMonitoring()
  }
}

async function chooseOption(button: HTMLElement, optionName: string) {
  await userEvent.click(button)
  await userEvent.click(screen.getByRole("option", { name: optionName }))
}

describe("SliderConfigPalette", () => {
  beforeEach(() => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on", selectionSlider: "on" })
  })

  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  it("offers the types whose flags are on", async () => {
    const { slider } = await setupSliderAndData()
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
    renderPalette(slider)
    await userEvent.click(screen.getByTestId("slider-type-button"))
    const options = screen.getAllByRole("option").map(option => option.textContent)
    expect(options).toEqual(["Variable", "Visibility"])
  })

  it("changes the slider's type", async () => {
    const { slider } = await setupSliderAndData()
    renderPalette(slider)
    await chooseOption(screen.getByTestId("slider-type-button"), "Visibility")
    expect(slider.sliderType).toBe("visibility")
    expect(screen.getByTestId("slider-type-button")).toHaveTextContent("Visibility")
  })

  it("undoes a switch to Variable, restoring the binding, width and title", async () => {
    const { dataSet, tile, slider } = await setupSliderAndData()
    act(() => {
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      slider.setRangeWidth(2)
    })
    renderPalette(slider)
    await withHistory(async settle => {
      await chooseOption(screen.getByTestId("slider-type-button"), "Variable")
      await settle()
      expect(slider.attributeId).toBeUndefined()
      act(() => appState.document.undoLastAction())
      await settle()
      expect(slider.sliderType).toBe("visibility")
      expect(slider.attributeId).toBe(dataSet.attrFromName("a3")!.id)
      expect(slider.rangeWidth).toBe(2)
      expect(getTitle(tile)).toBe(dataSet.childCollection.title)
    })
  })

  it("shows the width only for a range type", async () => {
    const { slider } = await setupSliderAndData()
    renderPalette(slider)
    expect(screen.queryByTestId("slider-range-width-input")).toBeNull()
    act(() => slider.setSliderType("visibility"))
    expect(screen.getByTestId("slider-range-width-input")).toBeInTheDocument()
    act(() => slider.setSliderType("variable"))
    expect(screen.queryByTestId("slider-range-width-input")).toBeNull()
  })

  it("sets the width as typed when Enter is pressed", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "2.345{Enter}")
    expect(slider.rangeWidth).toBe(2.345)
  })

  it("keeps the exact typed width when the field is left after Enter", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "2.345{Enter}")
    expect(input).toHaveValue("2.3")
    await userEvent.tab()
    expect(slider.rangeWidth).toBe(2.345)
  })

  it("leaves the width alone when the field is entered and left without an edit", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    act(() => slider.setRange(1, 4.14159))
    renderPalette(slider)
    await userEvent.click(screen.getByTestId("slider-range-width-input"))
    await userEvent.tab()
    expect(slider.rangeWidth).toBeCloseTo(3.14159, 10)
  })

  it("commits a pending edit when the palette is dismissed", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    const { unmount } = renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "4")
    unmount()
    expect(slider.rangeWidth).toBe(4)
  })

  it("stores a width wider than the axis as typed", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "500{Enter}")
    expect(slider.rangeWidth).toBe(500)
  })

  it("ignores a negative or non-numeric width", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    act(() => slider.setRangeWidth(2))
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "-1{Enter}")
    expect(slider.rangeWidth).toBe(2)
    expect(input).toHaveValue("2")
    await userEvent.clear(input)
    await userEvent.type(input, "abc{Enter}")
    expect(slider.rangeWidth).toBe(2)
    expect(input).toHaveValue("2")
  })

  it("undoes a width edit", async () => {
    const { slider } = await setupSliderAndData()
    act(() => {
      slider.setSliderType("visibility")
      slider.setRangeWidth(2)
    })
    renderPalette(slider)
    await withHistory(async settle => {
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "5{Enter}")
      await settle()
      expect(slider.rangeWidth).toBe(5)
      act(() => appState.document.undoLastAction())
      await settle()
      expect(slider.rangeWidth).toBe(2)
    })
  })

  it("discards a pending edit when Escape dismisses the palette", async () => {
    const { slider } = await setupSliderAndData()
    act(() => {
      slider.setSliderType("visibility")
      slider.setRangeWidth(2)
    })
    const setShowPalette = jest.fn()
    const { rerender } = render(<SliderConfigPalette sliderModel={slider} setShowPalette={setShowPalette}/>)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "7{Escape}")
    expect(setShowPalette).toHaveBeenCalledWith(undefined)
    rerender(<></>)
    expect(slider.rangeWidth).toBe(2)
  })

  it("follows a width changed elsewhere, such as by dragging the thumb", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    renderPalette(slider)
    act(() => slider.setRange(1, 4.14159))
    expect(screen.getByTestId("slider-range-width-input")).toHaveValue("3.1")
  })

  it("has no unit menu for a numeric slider", async () => {
    const { slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    renderPalette(slider)
    expect(screen.queryByTestId("slider-range-width-unit")).toBeNull()
  })

  describe("for a date slider", () => {
    async function setupDateSlider(spanSeconds: number, widthSeconds: number) {
      const { slider } = await setupSliderAndData()
      act(() => {
        slider.setScaleType("date")
        slider.setAxisMin(0)
        slider.setAxisMax(spanSeconds)
        slider.setSliderType("visibility")
        slider.setRangeWidth(widthSeconds)
      })
      renderPalette(slider)
      return slider
    }

    it("shows the width in the largest unit offered for the span", async () => {
      await setupDateSlider(2 * year, 0.5 * year)
      expect(screen.getByTestId("slider-range-width-input")).toHaveValue("0.5")
      expect(screen.getByTestId("slider-range-width-unit")).toHaveTextContent("years")
    })

    it("offers three units chosen from the span", async () => {
      await setupDateSlider(10 * day, 2 * day)
      await userEvent.click(screen.getByTestId("slider-range-width-unit"))
      const options = screen.getAllByRole("option").map(option => option.textContent)
      expect(options).toEqual(["weeks", "days", "hours"])
    })

    it("rescales the shown width, not the stored one, when the unit changes", async () => {
      const slider = await setupDateSlider(2 * year, 2 * week)
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "weeks")
      expect(screen.getByTestId("slider-range-width-input")).toHaveValue("2")
      expect(slider.rangeWidth).toBe(2 * week)
    })

    it("names the unit menu by its unit and its purpose", async () => {
      await setupDateSlider(2 * year, 0.5 * year)
      expect(screen.getByTestId("slider-range-width-unit")).toHaveAccessibleName("years Width unit")
    })

    it("agrees the unit in number with the width as shown", async () => {
      await setupDateSlider(2 * day, 1.04 * day)
      expect(screen.getByTestId("slider-range-width-input")).toHaveValue("1")
      expect(screen.getByTestId("slider-range-width-unit")).toHaveAccessibleName("day Width unit")
    })

    it("ignores a width too large to store once converted to seconds", async () => {
      const slider = await setupDateSlider(2 * year, 2 * week)
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "1e303{Enter}")
      expect(slider.rangeWidth).toBe(2 * week)
    })

    it("interprets a typed width in the chosen unit", async () => {
      const slider = await setupDateSlider(2 * year, 2 * week)
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "weeks")
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "3{Enter}")
      expect(slider.rangeWidth).toBe(3 * week)
    })

    it("falls back to the default unit when the chosen one is no longer offered", async () => {
      const slider = await setupDateSlider(2 * year, 2 * week)
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "weeks")
      act(() => slider.setAxisMax(20 * day))
      expect(screen.getByTestId("slider-range-width-unit")).toHaveTextContent("weeks")
      act(() => slider.setAxisMax(3 * day))
      expect(screen.getByTestId("slider-range-width-unit")).toHaveTextContent("days")
    })
  })
})
