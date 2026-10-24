import { autorun } from "mobx"
import { appState } from "../../models/app-state"
import { serializeCodapV2Document } from "../../models/document/serialize-document"
import { getTitle } from "../../models/tiles/tile-content-info"
import { configureSliderFromAttribute } from "./slider-attribute-drop"
import { ISliderModel, isSliderModel } from "./slider-model"
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

  it("clears the binding and width when switched to variable", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)

    slider.setSliderType("variable")

    expect(slider.attributeId).toBeUndefined()
    expect(slider.dataSetId).toBeUndefined()
    expect(slider.rangeWidth).toBeUndefined()
    expect(dataSet.itemIds).toHaveLength(6)
  })

  it("is unbound, with a default width, when switched back from variable", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)
    slider.setSliderType("variable")

    slider.setSliderType("visibility")

    const [min, max] = slider.axis.domain
    expect(slider.attribute).toBeUndefined()
    expect(slider.rangeWidth).toBeCloseTo((max - min) * kDefaultRangeFraction)
    expect(dataSet.itemIds).toHaveLength(6)
  })

  it("keeps the binding and width when switched between range types", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!
    slider.configureFromAttribute(dataSet, a3.id)
    slider.setRangeWidth(0)

    slider.setSliderType("selection")

    expect(slider.attributeId).toBe(a3.id)
    expect(slider.rangeWidth).toBe(0)
  })

  it("drops the title that came from the binding when switched to variable", async () => {
    const { dataSet, tile, slider } = await setupSliderAndData()
    configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a3")!.id)
    expect(getTitle(tile)).toBe(dataSet.childCollection.title)

    slider.setSliderType("variable")

    expect(getTitle(tile)).toBe(slider.name)
  })

  it("keeps a title a plugin set when switched to variable", async () => {
    const { dataSet, tile, slider } = await setupSliderAndData()
    configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a3")!.id)
    // the plugin API sets a title without marking it as the user's
    tile.setTitle("From a plugin")

    slider.setSliderType("variable")

    expect(getTitle(tile)).toBe("From a plugin")
  })

  it("drops the binding's title when switched to variable after a V2 save and reload", async () => {
    const { dataSet, tile } = await setupSliderAndData()
    configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a3")!.id)
    await appState.setDocument(await serializeCodapV2Document(appState.document))
    const restoredTile = Array.from(appState.document.content!.tileMap.values())
      .find(aTile => isSliderModel(aTile.content))!
    const restored = restoredTile.content as ISliderModel
    expect(getTitle(restoredTile)).toBe(restored.dataSet!.childCollection.title)

    restored.setSliderType("variable")

    expect(getTitle(restoredTile)).toBe(restored.name)
  })

  it("keeps a title the user set when switched to variable", async () => {
    const { dataSet, tile, slider } = await setupSliderAndData()
    configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a3")!.id)
    tile.setUserTitle("Heights")

    slider.setSliderType("variable")

    expect(getTitle(tile)).toBe("Heights")
  })
})

describe("SliderModel.setScaleType", () => {
  it("gives an unbound range slider the default width for its new axis", async () => {
    const { slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    slider.setScaleType("date")
    const [min, max] = slider.axis.domain
    expect(slider.rangeWidth).toBeCloseTo((max - min) / 10)
    slider.setScaleType("numeric")
    expect(slider.rangeWidth).toBeCloseTo(1.2)
  })

  it("leaves a variable slider without a width", async () => {
    const { slider } = await setupSliderAndData()
    slider.setScaleType("date")
    expect(slider.rangeWidth).toBeUndefined()
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

describe("SliderModel.widthUnitSpan for a date attribute", () => {
  it("follows edits to the attribute's values", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const when = dataSet.addAttribute({ name: "when", userType: "date" })
    const day = 24 * 60 * 60
    // captured before binding, after which the slider hides most of the cases
    const itemIds = dataSet.itemIds.slice()
    dataSet.setCaseValues(itemIds.map((__id__, i) => ({ __id__, [when.id]: `2026-01-0${i + 1}` })))
    slider.configureFromAttribute(dataSet, when.id)
    const spans: number[] = []
    const dispose = autorun(() => spans.push(slider.widthUnitSpan))
    expect(spans[spans.length - 1]).toBeCloseTo(5 * day)

    dataSet.setCaseValues([{ __id__: itemIds[5], [when.id]: "2030-01-01" }])

    expect(spans[spans.length - 1]).toBeGreaterThan(365 * day)
    dispose()
  })
})

describe("SliderModel.setRangeWidth", () => {
  it("snaps a range collapsed to zero width to the nearest data value", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    // a3's values are 1..6
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(3.4, 4.4)

    slider.setRangeWidth(0)

    expect(slider.rangeLow).toBe(3)
    expect(slider.rangeHigh).toBe(3)
    expect(dataSet.itemIds).toHaveLength(1)
  })

  it("leaves the low end alone for a nonzero width", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(3.4, 4.4)

    slider.setRangeWidth(0.5)

    expect(slider.rangeLow).toBe(3.4)
    expect(slider.rangeHigh).toBeCloseTo(3.9)
  })
})
