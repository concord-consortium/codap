import { getSnapshot } from "mobx-state-tree"
import { DataSet } from "../../models/data/data-set"
import { gDataBroker } from "../../models/data/data-broker"
import { getTileDataSet } from "../../models/shared/shared-data-tile-utils"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { convertToDate, unitsStringToMilliseconds } from "../../utilities/date-utils"
import { addDataSetCopy, setupSliderAndData } from "./slider-test-utils"

describe("SliderModel.configureFromAttribute", () => {
  it("converts a variable slider to a visibility slider bound to a numeric attribute", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!
    expect(slider.sliderType).toBe("variable")

    slider.configureFromAttribute(dataSet, a3.id)

    expect(slider.sliderType).toBe("visibility")
    expect(slider.scaleType).toBe("numeric")
    expect(slider.dataSetId).toBe(dataSet.id)
    expect(slider.attributeId).toBe(a3.id)
    expect(slider.axis.domain).toEqual([1, 6])
    expect(slider.rangeLow).toBe(1)
    expect(slider.rangeHigh).toBeCloseTo(1.5)
    expect(slider.value).toBe(1)
    expect(slider.dataSet).toBe(dataSet)
  })

  it("sets the value to the low end of the range despite an existing multiple restriction", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.setMultipleOf(2)
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    expect(slider.rangeLow).toBe(1)
    expect(slider.value).toBe(1)
    expect(slider.multipleOf).toBe(2)
  })

  it("keeps a selection slider a selection slider", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.setSliderType("selection")
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    expect(slider.sliderType).toBe("selection")
  })

  it("rejects categorical attributes without changing the slider", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const before = getSnapshot(slider)
    const a1 = dataSet.attrFromName("a1")!
    expect(slider.configurationExtent(dataSet, a1.id)).toBeUndefined()
    slider.configureFromAttribute(dataSet, a1.id)
    expect(getSnapshot(slider)).toEqual(before)
  })

  it("pads the axis when every value is the same", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const same = dataSet.addAttribute({ name: "same" })
    dataSet.setCaseValues(dataSet.itemIds.map(__id__ => ({ __id__, [same.id]: 7 })))
    slider.configureFromAttribute(dataSet, same.id)
    expect(slider.axis.domain).toEqual([6.5, 7.5])
    expect(slider.rangeLow).toBe(6.5)
    expect(slider.rangeHigh).toBeCloseTo(6.6)
  })

  it("uses a date scale in epoch seconds for date attributes", async () => {
    const { content, slider } = await setupSliderAndData()
    const source = DataSet.create({ name: "dates", collections: [{ name: "Events" }] })
    source.addAttribute({ name: "when", userType: "date" })
    source.addCases([{ when: "2020-01-01" }, { when: "2020-01-11" }], { canonicalize: true })
    const dates = addDataSetCopy(content, source)
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    const early = convertToDate("2020-01-01")!.valueOf() / 1000
    const late = convertToDate("2020-01-11")!.valueOf() / 1000
    expect(slider.scaleType).toBe("date")
    expect(slider.axis.domain).toEqual([early, late])
    expect(slider.rangeHigh).toBeCloseTo(early + (late - early) / 10)
  })

  it("pads a single-date attribute by half a day on each side", async () => {
    const { content, slider } = await setupSliderAndData()
    const source = DataSet.create({ name: "one date", collections: [{ name: "Events" }] })
    source.addAttribute({ name: "when", userType: "date" })
    source.addCases([{ when: "2020-01-01" }], { canonicalize: true })
    const dates = addDataSetCopy(content, source)
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    const day = convertToDate("2020-01-01")!.valueOf() / 1000
    const halfDay = unitsStringToMilliseconds("day") / 2000
    expect(slider.axis.domain).toEqual([day - halfDay, day + halfDay])
  })

  it("links the tile to the bound dataset and relinks when rebound", async () => {
    const { content, dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    expect(getTileDataSet(slider)).toBe(dataSet)

    const { dataset: otherSource } = setupTestDataset({ datasetName: "other" })
    const other = addDataSetCopy(content, otherSource)
    slider.configureFromAttribute(other, other.attrFromName("a4")!.id)
    expect(getTileDataSet(slider)).toBe(other)
  })

  it("reports no dataset once the bound dataset is removed", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    // the same path the plugin API's "delete dataContext" takes
    gDataBroker.removeDataSet(dataSet.id)
    expect(() => slider.dataSet).not.toThrow()
    expect(slider.dataSet).toBeUndefined()
  })
})
