import { render, screen } from "@testing-library/react"
import { MultiScale } from "../axis/models/multi-scale"
import { SliderRangeValues } from "./slider-range-values"
import { setupSliderAndData } from "./slider-test-utils"

// formats to whole numbers, so distinct values can look alike
const multiScale = { formatValueForScale: (value: number) => value.toFixed(0) } as unknown as MultiScale

describe("SliderRangeValues", () => {
  async function setup(low: number, high: number) {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setMultipleOf(undefined)
    slider.setRange(low, high)
    render(<SliderRangeValues sliderModel={slider} multiScale={multiScale}/>)
  }

  it("shows a collapsed range's value once", async () => {
    await setup(3, 3)
    expect(screen.getByTestId("slider-range-values")).toHaveTextContent(/^visible value\(s\)\s*=\s*3$/)
  })

  it("shows both ends of a non-collapsed range, even when they format alike", async () => {
    await setup(2, 2.3)
    expect(screen.getByTestId("slider-range-values")).toHaveTextContent(/=\s*2 - 2$/)
  })
})
