import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { convertToDate } from "../../../utilities/date-utils"
import { ISliderModel } from "../slider-model"
import { addDates, setupSliderAndData } from "../slider-test-utils"
import { SliderScalesPalette } from "./slider-scales-panel"

const seconds = (date: string) => convertToDate(date)!.valueOf() / 1000

function renderPalette(slider: ISliderModel) {
  return render(<SliderScalesPalette sliderModel={slider} setShowPalette={jest.fn()}/>)
}

describe("SliderScalesPalette", () => {
  // a span of about five years, which values show to the month
  async function setupDateSlider() {
    const { content, slider } = await setupSliderAndData()
    const dates = addDates(content, ["2020-03-15", "2025-06-10"])
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    return slider
  }

  it("shows a date axis's exact boundaries, not the boundaries rounded for display", async () => {
    const slider = await setupDateSlider()
    renderPalette(slider)
    expect(screen.getByTestId("slider-minimum")).toHaveValue("2020-03-15")
    expect(screen.getByTestId("slider-maximum")).toHaveValue("2025-06-10")
  })

  it("leaves a date axis alone when its fields are entered and left without an edit", async () => {
    const slider = await setupDateSlider()
    const domain = [...slider.axis.domain]
    renderPalette(slider)
    await userEvent.click(screen.getByTestId("slider-minimum"))
    await userEvent.tab()
    await userEvent.tab()
    expect(slider.axis.domain).toEqual(domain)
  })

  it("leaves a boundary's time of day alone when its field is left without an edit", async () => {
    const slider = await setupDateSlider()
    const min = seconds("2020-03-15T07:30")
    slider.setAxisMin(min)
    renderPalette(slider)
    await userEvent.click(screen.getByTestId("slider-minimum"))
    await userEvent.tab()
    expect(slider.axis.min).toBe(min)
  })

  it("sets a date boundary that's edited", async () => {
    const slider = await setupDateSlider()
    renderPalette(slider)
    const input = screen.getByTestId("slider-minimum")
    fireEvent.change(input, { target: { value: "2021-01-01" } })
    fireEvent.blur(input)
    expect(slider.axis.min).toBe(seconds("2021-01-01"))
  })

  it("records no change for a numeric field left without an edit", async () => {
    const { slider } = await setupSliderAndData()
    renderPalette(slider)
    const applyModelChange = jest.spyOn(slider.axis, "applyModelChange")
    await userEvent.click(screen.getByTestId("slider-minimum"))
    await userEvent.tab()
    expect(applyModelChange).not.toHaveBeenCalled()
  })

  it("sets a numeric boundary that's edited", async () => {
    const { slider } = await setupSliderAndData()
    renderPalette(slider)
    const input = screen.getByTestId("slider-maximum")
    await userEvent.clear(input)
    await userEvent.type(input, "20{Enter}")
    expect(slider.axis.max).toBe(20)
  })

  it("shows a numeric attribute's units after the minimum and maximum", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    act(() => {
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      dataSet.attrFromName("a3")!.setUnits("cm")
    })
    renderPalette(slider)
    for (const bound of ["minimum", "maximum"]) {
      expect(screen.getByTestId(`slider-${bound}-units`)).toHaveTextContent("cm")
      // and a screen reader hears them with the value
      expect(screen.getByTestId(`slider-${bound}`)).toHaveAccessibleDescription("cm")
    }
  })

  it("shows no units for a date attribute", async () => {
    const slider = await setupDateSlider()
    act(() => slider.attribute!.setUnits("cm"))
    renderPalette(slider)
    expect(screen.queryByTestId("slider-minimum-units")).toBeNull()
    expect(screen.queryByTestId("slider-maximum-units")).toBeNull()
  })
})
