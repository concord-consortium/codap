import { act, render, screen } from "@testing-library/react"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { appState } from "../../../models/app-state"
import { featureFlagManager } from "../../../models/feature-flags/feature-flag-manager"
import { TreeManager } from "../../../models/history/tree-manager"
import { getTitle } from "../../../models/tiles/tile-content-info"
import { ISliderModel } from "../slider-model"
import { addDates, setupSliderAndData } from "../slider-test-utils"
import { durationUnitSeconds } from "../../../utilities/date-utils"
import { SliderConfigPalette } from "./slider-config-panel"

const [year, month, week, day] = (["year", "month", "week", "day"] as const).map(durationUnitSeconds)

function renderPalette(slider: ISliderModel) {
  return render(<SliderConfigPalette sliderModel={slider} setShowPalette={jest.fn()}/>)
}

// a visibility slider bound to the test dataset's a3, whose values are 1..6
async function setupBoundSlider() {
  const result = await setupSliderAndData()
  const { dataSet, slider } = result
  act(() => slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id))
  return result
}

// a date as the date parser reads it, in local time, so the dates' span in seconds is exact
function localDateString(ms: number) {
  const date = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
const kDateStart = new Date(2001, 0, 1).getTime()

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

  it("sets the width as typed on Enter, and keeps it exact when the field is then left", async () => {
    const { slider } = await setupBoundSlider()
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "2.345{Enter}")
    expect(slider.rangeWidth).toBe(2.345)
    expect(input).toHaveValue("2.3")
    await userEvent.tab()
    expect(slider.rangeWidth).toBe(2.345)
  })

  it("ignores an empty width", async () => {
    const { slider } = await setupBoundSlider()
    act(() => slider.setRangeWidth(2))
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "  {Enter}")
    expect(slider.rangeWidth).toBe(2)
    expect(input).toHaveValue("2")
  })

  it("leaves the width alone when the field is entered and left without an edit", async () => {
    const { slider } = await setupBoundSlider()
    act(() => slider.setRange(1, 4.14159))
    renderPalette(slider)
    await userEvent.click(screen.getByTestId("slider-range-width-input"))
    await userEvent.tab()
    expect(slider.rangeWidth).toBeCloseTo(3.14159, 10)
  })

  it("commits a pending edit when the palette is dismissed", async () => {
    const { slider } = await setupBoundSlider()
    const { unmount } = renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "4")
    unmount()
    expect(slider.rangeWidth).toBe(4)
  })

  it("stores a width wider than the axis as typed", async () => {
    const { slider } = await setupBoundSlider()
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "500{Enter}")
    expect(slider.rangeWidth).toBe(500)
  })

  it("ignores a negative or non-numeric width", async () => {
    const { slider } = await setupBoundSlider()
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
    const { slider } = await setupBoundSlider()
    act(() => slider.setRangeWidth(2))
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
    const { slider } = await setupBoundSlider()
    act(() => slider.setRangeWidth(2))
    // as the inspector does, the parent removes the palette when it asks to be closed, without rendering it again
    function Host() {
      const [isOpen, setIsOpen] = useState(true)
      return isOpen ? <SliderConfigPalette sliderModel={slider} setShowPalette={() => setIsOpen(false)}/> : null
    }
    render(<Host/>)
    const input = screen.getByTestId("slider-range-width-input")
    await userEvent.clear(input)
    await userEvent.type(input, "7{Escape}")
    expect(screen.queryByTestId("slider-range-width-input")).toBeNull()
    expect(slider.rangeWidth).toBe(2)
  })

  it("follows a width changed elsewhere, such as by dragging the thumb", async () => {
    const { slider } = await setupBoundSlider()
    renderPalette(slider)
    act(() => slider.setRange(1, 4.14159))
    expect(screen.getByTestId("slider-range-width-input")).toHaveValue("3.1")
  })

  it("shows the bound attribute's units after the width", async () => {
    const { dataSet, slider } = await setupBoundSlider()
    act(() => dataSet.attrFromName("a3")!.setUnits("cm"))
    renderPalette(slider)
    expect(screen.getByTestId("slider-range-width-units")).toHaveTextContent("cm")
    // and a screen reader hears them with the width
    expect(screen.getByTestId("slider-range-width-input")).toHaveAccessibleDescription("cm")
  })

  it("rounds all the corners of a numeric width's field, which no unit menu adjoins", async () => {
    const { slider } = await setupBoundSlider()
    renderPalette(slider)
    expect(screen.getByTestId("slider-range-width-field")).not.toHaveClass("multiples-input")
  })

  it("shows no units for an attribute without them", async () => {
    const { slider } = await setupBoundSlider()
    renderPalette(slider)
    expect(screen.queryByTestId("slider-range-width-units")).toBeNull()
  })

  it("leaves the width empty and disabled until an attribute is bound", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    act(() => slider.setSliderType("visibility"))
    renderPalette(slider)
    const input = screen.getByTestId("slider-range-width-input")
    const row = screen.getByTestId("slider-range-width-row")
    expect(input).toBeDisabled()
    expect(input).toHaveValue("")
    // the row, label included, looks disabled too
    expect(row).toHaveClass("disabled")
    act(() => slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id))
    expect(input).toBeEnabled()
    expect(input).toHaveValue("0.5")
    expect(row).not.toHaveClass("disabled")
  })

  it("disables a date slider's unit menu until an attribute is bound", async () => {
    const { slider } = await setupSliderAndData()
    act(() => {
      slider.setScaleType("date")
      slider.setSliderType("visibility")
    })
    renderPalette(slider)
    const unitMenu = screen.getByTestId("slider-range-width-unit")
    expect(unitMenu).toBeDisabled()
    // empty, like the width (the button's text is just its arrow)
    expect(unitMenu).toHaveTextContent(/^▾$/)
  })

  it("has no unit menu for a numeric slider", async () => {
    const { slider } = await setupBoundSlider()
    renderPalette(slider)
    expect(screen.queryByTestId("slider-range-width-unit")).toBeNull()
  })

  describe("for a date slider", () => {
    // a visibility slider bound to dates spanning the given seconds, with the given width
    async function setupDateSlider(spanSeconds: number, widthSeconds: number) {
      const { content, slider } = await setupSliderAndData()
      const dates = addDates(content, [localDateString(kDateStart), localDateString(kDateStart + spanSeconds * 1000)])
      act(() => {
        slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
        slider.setRangeWidth(widthSeconds)
      })
      const { unmount } = renderPalette(slider)
      return { slider, dates, unmount }
    }

    it("joins the width's field to its unit menu", async () => {
      await setupDateSlider(2 * year, 0.5 * year)
      expect(screen.getByTestId("slider-range-width-field")).toHaveClass("multiples-input")
    })

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

    it("applies a unit chosen while an edit is pending to the edit", async () => {
      // a span of months offers months, weeks, and days
      const { slider } = await setupDateSlider(6 * month, 1.2 * month)
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "2")
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "days")
      expect(slider.rangeWidth).toBe(2 * day)
      expect(input).toHaveValue("2")
    })

    // (In a browser, closing the menu returns focus to the unit button, and leaving that commits the edit too;
    // jsdom drops the focus to the body instead.)
    it("keeps an edit pending when the unit menu closes without a choice, then commits it in the unit shown",
        async () => {
      const { slider, unmount } = await setupDateSlider(6 * month, 1.2 * month)
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "2")
      await userEvent.click(screen.getByTestId("slider-range-width-unit"))
      await userEvent.keyboard("{Escape}")
      expect(slider.rangeWidth).toBeCloseTo(1.2 * month)
      expect(input).toHaveValue("2")
      unmount()
      expect(slider.rangeWidth).toBe(2 * month)
    })

    it("applies a unit chosen from the keyboard after tabbing from the field to the edit", async () => {
      const { slider } = await setupDateSlider(6 * month, 1.2 * month)
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "3")
      await userEvent.tab()
      expect(screen.getByTestId("slider-range-width-unit")).toHaveFocus()
      expect(slider.rangeWidth).toBeCloseTo(1.2 * month)
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "weeks")
      expect(slider.rangeWidth).toBe(3 * week)
    })

    it("rescales the shown width, not the stored one, when the unit changes", async () => {
      const { slider } = await setupDateSlider(2 * year, 2 * week)
      // two weeks, in years
      expect(screen.getByTestId("slider-range-width-input")).toHaveValue("0.038")
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "weeks")
      expect(screen.getByTestId("slider-range-width-input")).toHaveValue("2")
      expect(slider.rangeWidth).toBe(2 * week)
    })

    it("labels the unit to agree with the number being typed", async () => {
      await setupDateSlider(10 * day, 1.5 * week)
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "1")
      expect(screen.getByTestId("slider-range-width-unit")).toHaveTextContent(/^week(?!s)/)
      await userEvent.type(input, "2")
      expect(screen.getByTestId("slider-range-width-unit")).toHaveTextContent(/^weeks/)
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
      const { slider } = await setupDateSlider(2 * year, 2 * week)
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "1e303{Enter}")
      expect(slider.rangeWidth).toBe(2 * week)
    })

    it("interprets a typed width in the chosen unit", async () => {
      const { slider } = await setupDateSlider(2 * year, 2 * week)
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "weeks")
      const input = screen.getByTestId("slider-range-width-input")
      await userEvent.clear(input)
      await userEvent.type(input, "3{Enter}")
      expect(slider.rangeWidth).toBe(3 * week)
    })

    it("falls back to the default unit when the chosen one is no longer offered", async () => {
      const { dates } = await setupDateSlider(2 * year, 2 * week)
      await chooseOption(screen.getByTestId("slider-range-width-unit"), "weeks")
      const whenId = dates.attrFromName("when")!.id
      const lastItemId = dates.itemIdsIgnoringSliderFilters[1]
      // shrink the dates' span to three days
      act(() => dates.setCaseValues([{ __id__: lastItemId, [whenId]: localDateString(kDateStart + 3 * day * 1000) }]))
      expect(screen.getByTestId("slider-range-width-unit")).toHaveTextContent("days")
    })
  })
})
