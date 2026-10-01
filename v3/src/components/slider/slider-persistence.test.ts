import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet, IDataSet } from "../../models/data/data-set"
import { serializeCodapV2Document, serializeCodapV3Document } from "../../models/document/serialize-document"
import { kSharedDataSetType, SharedDataSet } from "../../models/shared/shared-data-set"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { convertToDate } from "../../utilities/date-utils"
import { ICodapV2DocumentJson, ICodapV2SliderStorage } from "../../v2/codap-v2-types"
import { ISliderModel, isSliderModel } from "./slider-model"
import { addDataSetCopy, setupSliderAndData } from "./slider-test-utils"

// saves the current document in the given format and loads the result in its place
async function reloadDocument(format: "v2" | "v3") {
  const saved = format === "v2"
    ? await serializeCodapV2Document(appState.document)
    : await serializeCodapV3Document(appState.document)
  await appState.setDocument(saved)
}
function findSlider(): ISliderModel {
  const slider = Array.from(appState.document.content!.tileMap.values())
    .map(tile => tile.content).find(isSliderModel)
  if (!slider) throw new Error("expected a slider tile")
  return slider
}
function findDataSet(attrName: string): IDataSet {
  const dataSet = getSharedModelManager(appState.document)!
    .getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
    .map(model => model.dataSet).find(ds => ds.attrFromName(attrName))
  if (!dataSet) throw new Error(`expected a dataset with attribute ${attrName}`)
  return dataSet
}
// the standard test dataset's a3 values are 1..6
const visibleA3 = (dataSet: IDataSet) => {
  const a3 = dataSet.attrFromName("a3")!.id
  return dataSet.itemIds.map(itemId => dataSet.getNumeric(itemId, a3)).sort()
}

describe("slider persistence: V3 save and reload", () => {
  it("restores a visibility slider's type, attribute, range, and hiding", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)
    expect(visibleA3(dataSet)).toEqual([2, 3, 4])

    await reloadDocument("v3")
    const restored = findSlider()
    const restoredData = findDataSet("a3")
    // a new document, not the one that was saved
    expect(restored).not.toBe(slider)
    expect(restoredData).not.toBe(dataSet)
    expect(restored.sliderType).toBe("visibility")
    expect(restored.dataSetId).toBe(restoredData.id)
    expect(restored.attributeId).toBe(restoredData.attrFromName("a3")!.id)
    expect([restored.rangeLow, restored.rangeHigh]).toEqual([2, 4])
    expect(visibleA3(restoredData)).toEqual([2, 3, 4])
    // hidden by the slider, not set aside, so closing the slider would show every case
    expect(restoredData.itemIdsIgnoringSliderFilters).toHaveLength(6)
  })

  it("restores a variable slider unchanged", async () => {
    const { slider } = await setupSliderAndData()
    slider.setValue(3)
    await reloadDocument("v3")
    const restored = findSlider()
    expect(restored.sliderType).toBe("variable")
    expect(restored.value).toBe(3)
    expect(restored.dataSetId).toBeUndefined()
  })
})

// the slider component's storage in a V2 export of the current document
async function exportedSliderStorage() {
  const v2Json = await serializeCodapV2Document<ICodapV2DocumentJson>(appState.document)
  const component = v2Json.components.find(c => c.type === "DG.SliderView")!
  return { v2Json, storage: component.componentStorage }
}

describe("slider persistence: V3 → V2 → V3", () => {
  it("round-trips a visibility slider's type, attribute, range, and hiding", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)

    await reloadDocument("v2")
    const restored = findSlider()
    const restoredData = findDataSet("a3")
    expect(restored).not.toBe(slider)
    expect(restored.sliderType).toBe("visibility")
    expect(restored.dataSetId).toBe(restoredData.id)
    expect(restored.attributeId).toBe(restoredData.attrFromName("a3")!.id)
    expect([restored.rangeLow, restored.rangeHigh]).toEqual([2, 4])
    expect(visibleA3(restoredData)).toEqual([2, 3, 4])
    // hidden by the slider, not set aside, so closing the slider would show every case
    expect(restoredData.itemIdsIgnoringSliderFilters).toHaveLength(6)
  })

  it("exports a range slider to V2 as a variable slider at the range's low end", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)
    const { v2Json, storage } = await exportedSliderStorage()
    const global = v2Json.globalValues.find(g => g.guid === storage._links_.model.id)!
    expect(global.value).toBe(2)
    expect([storage.lowerBound, storage.upperBound]).toEqual(slider.axis.domain)
    expect(storage.v3).toMatchObject({ sliderType: "visibility", rangeWidth: 2 })
  })

  it("writes no range fields for a variable slider", async () => {
    await setupSliderAndData()
    const { storage } = await exportedSliderStorage()
    expect(Object.keys(storage.v3!).sort()).toEqual(["dateMultipleOfUnit", "multipleOf", "scaleType"])
  })

  it("round-trips a collapsed range", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(3, 3)
    await reloadDocument("v2")
    const restored = findSlider()
    expect(restored.rangeWidth).toBe(0)
    expect([restored.rangeLow, restored.rangeHigh]).toEqual([3, 3])
    expect(visibleA3(findDataSet("a3"))).toEqual([3])
  })

  it("round-trips a date-scale visibility slider", async () => {
    const { content, slider } = await setupSliderAndData()
    const source = DataSet.create({ name: "dates", collections: [{ name: "Events" }] })
    source.addAttribute({ name: "when", userType: "date" })
    source.addCases([{ when: "2020-01-01" }, { when: "2020-01-06" }, { when: "2020-01-11" }],
                    { canonicalize: true })
    const dates = addDataSetCopy(content, source)
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    const early = convertToDate("2020-01-01")!.valueOf() / 1000
    const middle = convertToDate("2020-01-06")!.valueOf() / 1000
    slider.setRange(early, middle)

    await reloadDocument("v2")
    const restored = findSlider()
    expect(restored.scaleType).toBe("date")
    expect([restored.rangeLow, restored.rangeHigh]).toEqual([early, middle])
    expect(findDataSet("when").itemIds).toHaveLength(2)
  })

  it("imports a range slider whose dataset was deleted as a slider that hides nothing", async () => {
    const { content, dataSet, slider } = await setupSliderAndData()
    // another dataset with the same attributes, which the slider mustn't start hiding
    const { dataset: otherSource } = setupTestDataset({ datasetName: "other" })
    addDataSetCopy(content, otherSource)
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    gDataBroker.removeDataSet(dataSet.id)
    await expect(reloadDocument("v2")).resolves.toBeUndefined()
    const restored = findSlider()
    const other = findDataSet("a3")
    expect(restored.sliderType).toBe("visibility")
    expect(restored.dataSet).toBeUndefined()
    expect(restored.dataSetId).not.toBe(other.id)
    expect(other.itemIds).toHaveLength(6)
  })
})

describe("slider persistence: importing a damaged V2 range slider", () => {
  // exports a visibility slider over a3 (axis [1, 6], range [2, 4]) to V2, edits its v3 block, and loads the result
  async function importEdited(edit: (v3: NonNullable<ICodapV2SliderStorage["v3"]>) => void) {
    const { dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)
    const { v2Json, storage } = await exportedSliderStorage()
    edit(storage.v3!)
    await appState.setDocument(v2Json)
    return findSlider()
  }

  it("imports an unknown slider type as a variable slider", async () => {
    const slider = await importEdited(v3 => { (v3 as any).sliderType = "mystery" })
    expect(slider.sliderType).toBe("variable")
    expect(findDataSet("a3").itemIds).toHaveLength(6)
  })

  it.each([
    ["negative", -1, 0],
    ["non-numeric", NaN, 0],
    ["missing", undefined, 0],
    ["wider than the axis", 100, 5]
  ])("imports a %s width as one that fits the axis", async (_label, rangeWidth, expected) => {
    const slider = await importEdited(v3 => { v3.rangeWidth = rangeWidth })
    expect(slider.rangeWidth).toBe(expected)
    expect(slider.rangeHigh).toBeGreaterThanOrEqual(slider.rangeLow)
  })
})

