import { render, screen } from "@testing-library/react"
import { IDataSet, DataSet } from "../../models/data/data-set"
import { IDocumentContentModel } from "../../models/document/document-content"
import { convertToDate } from "../../utilities/date-utils"
import { MultiScale } from "../axis/models/multi-scale"
import { isDateAxisModel } from "../axis/models/numeric-axis-models"
import { SliderRangeValues } from "./slider-range-values"
import { addDataSetCopy, setupSliderAndData } from "./slider-test-utils"

// a dataset of one date attribute, "when", holding the given dates
function addDates(content: IDocumentContentModel, dates: string[]): IDataSet {
  const source = DataSet.create({ name: "dates", collections: [{ name: "Events" }] })
  source.addAttribute({ name: "when", userType: "date" })
  source.addCases(dates.map(when => ({ when })), { canonicalize: true })
  return addDataSetCopy(content, source)
}

const seconds = (date: string) => convertToDate(date)!.valueOf() / 1000

describe("a range slider bound to a date attribute", () => {
  it.each([
    ["hours", "2026-01-01T00:00", "2026-01-01T05:00"],
    ["days", "2026-01-01", "2026-01-11"],
    ["years", "2020-01-01", "2026-01-01"],
    ["decades", "1950-01-01", "2020-01-01"]
  ])("has a date axis over the attribute's span of %s", async (_label, first, last) => {
    const { content, slider } = await setupSliderAndData()
    const dates = addDates(content, [first, last])
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    expect(slider.scaleType).toBe("date")
    expect(isDateAxisModel(slider.axis)).toBe(true)
    expect(slider.axis.domain).toEqual([seconds(first), seconds(last)])
  })

  it("returns to a numeric axis when switched to a numeric attribute", async () => {
    const { content, dataSet, slider } = await setupSliderAndData()
    const dates = addDates(content, ["2020-01-01", "2026-01-01"])
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    expect(slider.scaleType).toBe("numeric")
    expect(isDateAxisModel(slider.axis)).toBe(false)
  })

  it("shows its range as dates", async () => {
    const { content, slider } = await setupSliderAndData()
    const dates = addDates(content, ["2020-01-01", "2026-01-01"])
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    // as the slider sets up its scale: linear, with dates as epoch seconds
    const multiScale = new MultiScale({ scaleType: "linear", orientation: "horizontal" })
    multiScale.setLength(300)
    multiScale.setNumericDomain(slider.axis.domain)
    render(<SliderRangeValues sliderModel={slider} multiScale={multiScale}/>)
    const text = screen.getByTestId("slider-range-values").textContent ?? ""
    // the range starts at the first date; its ends are dates, not epoch seconds
    expect(text).toMatch(/2020/)
    expect(text).not.toMatch(String(Math.round(seconds("2020-01-01"))))
  })

  it.each([
    ["months", "2005-05-01", "2005-12-31", /^\d+\/\d+\/2005$/],
    ["decades", "1950-01-01", "2020-01-01", /^\d+\/1950$/]
  ])("shows its range ends to the precision a graph's date axis would, for a span of %s",
      async (_label, first, last, endPattern) => {
    const { content, slider } = await setupSliderAndData()
    const dates = addDates(content, [first, last])
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    const multiScale = new MultiScale({ scaleType: "linear", orientation: "horizontal" })
    multiScale.setLength(300)
    multiScale.setNumericDomain(slider.axis.domain)
    render(<SliderRangeValues sliderModel={slider} multiScale={multiScale}/>)
    // e.g. "visible value(s) = 5/1/2005 - 6/14/2005"
    const text = screen.getByTestId("slider-range-values").textContent ?? ""
    const [low] = text.split("=")[1].trim().split(" - ")
    expect(low).toMatch(endPattern)
  })
})
