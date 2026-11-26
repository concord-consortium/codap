import { render, screen } from "@testing-library/react"
import { MultiScale } from "../axis/models/multi-scale"
import { isDateAxisModel } from "../axis/models/numeric-axis-models"
import { ISliderModel } from "./slider-model"
import { SliderRangeValues } from "./slider-range-values"
import { addDates, setupSliderAndData } from "./slider-test-utils"

// the range's ends as shown, e.g. ["5/1/2005", "6/14/2005"] from "visible value(s) = 5/1/2005 - 6/14/2005"
function renderRangeEnds(slider: ISliderModel) {
  // as the slider sets up its scale: linear, with dates as epoch seconds
  const multiScale = new MultiScale({ scaleType: "linear", orientation: "horizontal" })
  multiScale.setLength(300)
  multiScale.setNumericDomain(slider.axis.domain)
  render(<SliderRangeValues sliderModel={slider} multiScale={multiScale}/>)
  const text = screen.getByTestId("slider-range-values").textContent ?? ""
  return text.split("=")[1].trim().split(" - ")
}

describe("a range slider bound to a date attribute", () => {
  it("returns to a numeric axis when switched to a numeric attribute", async () => {
    const { content, dataSet, slider } = await setupSliderAndData()
    const dates = addDates(content, ["2020-01-01", "2026-01-01"])
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    expect(isDateAxisModel(slider.axis)).toBe(true)
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    expect(slider.scaleType).toBe("numeric")
    expect(isDateAxisModel(slider.axis)).toBe(false)
  })

  // a new range is a tenth of the axis wide, starting at the first date
  it.each([
    ["minutes", "2026-01-01T00:00", "2026-01-01T00:05", ["1/1/2026, 12:00:00 AM", "1/1/2026, 12:00:30 AM"]],
    ["hours", "2026-01-01T00:00", "2026-01-01T05:00", ["1/1/2026, 12:00 AM", "1/1/2026, 12:30 AM"]],
    ["days", "2026-01-01", "2026-01-11", ["1/1/2026, 12 AM", "1/2/2026, 12 AM"]],
    ["months", "2005-05-01", "2005-12-31", ["5/1/2005", "5/25/2005"]],
    ["decades", "1950-01-01", "2020-01-01", ["1/1950", "12/1956"]]
  ])("shows its range ends to the precision a graph's date axis would, for a span of %s",
      async (_label, first, last, ends) => {
    const { content, slider } = await setupSliderAndData()
    const dates = addDates(content, [first, last])
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    expect(renderRangeEnds(slider)).toEqual(ends)
  })
})
