import { act, render, screen } from "@testing-library/react"
import { ISliderModel } from "../slider-model"
import { addDates, setupSliderAndData } from "../slider-test-utils"
import { SliderSettingsPalette } from "./slider-settings-panel"

function renderPalette(slider: ISliderModel) {
  return render(<SliderSettingsPalette sliderModel={slider} setShowPalette={jest.fn()}/>)
}

describe("SliderSettingsPalette", () => {
  it("shows a numeric attribute's units after the multiple restriction", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    act(() => {
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      dataSet.attrFromName("a3")!.setUnits("cm")
    })
    renderPalette(slider)
    expect(screen.getByTestId("slider-multiples-units")).toHaveTextContent("cm")
    // and a screen reader hears them with the value
    expect(screen.getByTestId("slider-multiples-value-input")).toHaveAccessibleDescription("cm")
  })

  it("shows no units for an unbound slider", async () => {
    const { slider } = await setupSliderAndData()
    renderPalette(slider)
    expect(screen.queryByTestId("slider-multiples-units")).toBeNull()
  })

  it("shows no units for a date attribute, which has its unit menu", async () => {
    const { content, slider } = await setupSliderAndData()
    const dates = addDates(content, ["2020-03-15", "2025-06-10"])
    act(() => {
      slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
      dates.attrFromName("when")!.setUnits("cm")
    })
    renderPalette(slider)
    expect(screen.queryByTestId("slider-multiples-units")).toBeNull()
    expect(screen.getByTestId("slider-date-unit")).toBeInTheDocument()
  })
})
