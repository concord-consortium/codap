import { kDefaultRangeFraction } from "./slider-types"
import { setupSliderAndData } from "./slider-test-utils"

describe("SliderModel.setSliderType", () => {
  it("gives an unbound slider switched to a range type a default width", async () => {
    const { slider } = await setupSliderAndData()
    const [min, max] = slider.axis.domain
    expect(slider.rangeWidth).toBeUndefined()

    slider.setSliderType("visibility")

    expect(slider.rangeWidth).toBeCloseTo((max - min) * kDefaultRangeFraction)
    expect(slider.rangeHigh - slider.rangeLow).toBeCloseTo((max - min) * kDefaultRangeFraction)
  })

  it("keeps the width and binding through a round trip to variable", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!
    slider.configureFromAttribute(dataSet, a3.id)
    slider.setRange(2, 4)

    slider.setSliderType("variable")
    slider.setSliderType("visibility")

    expect(slider.rangeWidth).toBe(2)
    expect(slider.attributeId).toBe(a3.id)
    expect(slider.dataSetId).toBe(dataSet.id)
  })

  it("hides cases again when switched back to visibility", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)
    const visibleCount = dataSet.itemIds.length
    expect(visibleCount).toBeLessThan(6)

    slider.setSliderType("variable")
    expect(dataSet.itemIds).toHaveLength(6)
    slider.setSliderType("visibility")
    expect(dataSet.itemIds).toHaveLength(visibleCount)
  })

  it("keeps an explicit zero width", async () => {
    const { slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    slider.setRangeWidth(0)
    slider.setSliderType("variable")
    slider.setSliderType("selection")
    expect(slider.rangeWidth).toBe(0)
  })
})

describe("SliderModel.widthUnitSpan", () => {
  it("is the bound attribute's extent", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    // zoom the axis out; the span still follows the data
    slider.setAxisMax(100)
    expect(slider.widthUnitSpan).toBe(5)
  })

  it("is the axis span when no attribute is bound", async () => {
    const { slider } = await setupSliderAndData()
    const [min, max] = slider.axis.domain
    expect(slider.widthUnitSpan).toBe(max - min)
  })
})
