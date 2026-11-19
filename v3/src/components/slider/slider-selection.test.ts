import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { IDataSet } from "../../models/data/data-set"
import { addSetAsideCases, setSelectedCases } from "../../models/data/data-set-utils"
import { IDocumentContentModel } from "../../models/document/document-content"
import { TreeManager } from "../../models/history/tree-manager"
import { toV3Id } from "../../utilities/codap-utils"
import { ISliderModel } from "./slider-model"
import { rangeChangeOptions } from "./slider-range-change"
import { kSliderIdPrefix } from "./slider-registration"
import { selectExactly, visibleSetsEqual } from "./slider-selection"
import { addDates, setupSliderAndData } from "./slider-test-utils"

// adds another slider of the given type to the document, bound to the dataset's a3
function addSlider(content: IDocumentContentModel, dataSet: IDataSet, sliderType: "selection" | "visibility") {
  const result = diComponentHandler.create!({}, { type: "slider" })
  const tile = content.tileMap.get(toV3Id(kSliderIdPrefix, (result.values as DIComponentInfo).id!))!
  const slider = tile.content as ISliderModel
  slider.setSliderType(sliderType)
  slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
  return slider
}

// the standard test dataset's a3 values are 1..6, so configuring from a3 gives axis [1, 6] and range [1, 1.5]
async function setupSelectionSlider() {
  const setup = await setupSliderAndData()
  setup.slider.setSliderType("selection")
  setup.slider.configureFromAttribute(setup.dataSet, setup.dataSet.attrFromName("a3")!.id)
  return setup
}

const a3Id = (dataSet: IDataSet) => dataSet.attrFromName("a3")!.id
// the sorted a3 values of the selected visible items
const selectedA3 = (dataSet: IDataSet) => {
  const a3 = a3Id(dataSet)
  return dataSet.itemIds.filter(itemId => dataSet.selection.has(itemId))
    .map(itemId => dataSet.getNumeric(itemId, a3)).sort()
}
// the id of the item whose a3 value is the given value
const idOf = (dataSet: IDataSet, value: number) => {
  const a3 = a3Id(dataSet)
  return dataSet.itemIdsIgnoringSliderFilters.find(itemId => dataSet.getNumeric(itemId, a3) === value)!
}

describe("isValueInRange", () => {
  it("includes both ends and excludes values just outside them", async () => {
    const { slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    expect([1.999, 2, 3, 4, 4.001].map(v => slider.isValueInRange(v))).toEqual([false, true, true, true, false])
  })

  it("tolerates floating-point error at the bounds, but no more", async () => {
    const { slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    expect(slider.isValueInRange(4 + 4 * Number.EPSILON)).toBe(true)
    expect(slider.isValueInRange(2 - 4 * Number.EPSILON)).toBe(true)
    expect(slider.isValueInRange(4 + 1e-9)).toBe(false)
  })

  it("never includes a missing or non-finite value", async () => {
    const { slider } = await setupSelectionSlider()
    slider.setRange(1, 6)
    expect([null, undefined, NaN, Infinity, -Infinity].map(v => slider.isValueInRange(v)))
      .toEqual([false, false, false, false, false])
  })
})

describe("isBoundSelectionSlider", () => {
  it("is true only for a selection slider with an attribute that has no formula", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    expect(slider.isBoundSelectionSlider).toBe(true)
    const a3 = dataSet.attrFromName("a3")!
    a3.setDisplayExpression("caseIndex")
    expect(slider.isBoundSelectionSlider).toBe(false)
    a3.clearFormula()
    expect(slider.isBoundSelectionSlider).toBe(true)
    slider.setSliderType("visibility")
    expect(slider.isBoundSelectionSlider).toBe(false)
  })

  it("is false once the bound attribute is deleted", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    dataSet.removeAttribute(a3Id(dataSet))
    expect(slider.isBoundSelectionSlider).toBe(false)
  })
})

describe("visibleSetsEqual", () => {
  it("compares sets regardless of order, and finds a difference in either direction", async () => {
    const { dataSet } = await setupSelectionSlider()
    const [one, two, three] = [1, 2, 3].map(v => idOf(dataSet, v))
    expect(visibleSetsEqual(dataSet, [one, two], [two, one])).toBe(true)
    expect(visibleSetsEqual(dataSet, [one, two], [one])).toBe(false)
    expect(visibleSetsEqual(dataSet, [one], [one, two])).toBe(false)
    expect(visibleSetsEqual(dataSet, [one, two], [one, three])).toBe(false)
  })

  it("ignores items the dataset hides, on either side", async () => {
    const { dataSet } = await setupSelectionSlider()
    const [one, two, three] = [1, 2, 3].map(v => idOf(dataSet, v))
    addSetAsideCases(dataSet, [three], false)
    expect(visibleSetsEqual(dataSet, [one, two, three], [one, two])).toBe(true)
    expect(visibleSetsEqual(dataSet, [one, two], [three, two, one])).toBe(true)
  })
})

describe("selectExactly", () => {
  it("replaces the selection with the given items", async () => {
    const { dataSet } = await setupSelectionSlider()
    setSelectedCases([1, 2].map(v => idOf(dataSet, v)), dataSet)
    selectExactly(dataSet, new Set([2, 3].map(v => idOf(dataSet, v))))
    expect(selectedA3(dataSet)).toEqual([2, 3])
  })

  it("leaves an already-exact selection untouched", async () => {
    const { dataSet } = await setupSelectionSlider()
    const ids = [2, 3].map(v => idOf(dataSet, v))
    setSelectedCases(ids, dataSet)
    const changes = dataSet.selectionChanges
    selectExactly(dataSet, new Set(ids))
    expect(dataSet.selectionChanges).toBe(changes)
  })
})

describe("selection slider target and ownership", () => {
  it("resuming selects exactly the visible cases in range", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    expect(selectedA3(dataSet)).toEqual([2, 3, 4])
    expect(slider.ownsSelection).toBe(true)
    expect(slider.isSelectionPaused).toBe(false)
  })

  it("never selects set-aside cases", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    const three = idOf(dataSet, 3)
    addSetAsideCases(dataSet, [three], false)
    slider.setRange(2, 4)
    slider.resumeSelection()
    expect(selectedA3(dataSet)).toEqual([2, 4])
    expect(dataSet.selection.has(three)).toBe(false)
  })

  it("selecting elsewhere pauses without touching the selection", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    setSelectedCases([idOf(dataSet, 6)], dataSet)
    expect(slider.ownsSelection).toBe(false)
    expect(slider.isSelectionPaused).toBe(true)
    expect(selectedA3(dataSet)).toEqual([6])
  })

  it("a data edit into the range looks paused but keeps ownership", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    dataSet.setCaseValues([{ __id__: idOf(dataSet, 6), [a3Id(dataSet)]: 3 }])
    expect(slider.ownsSelection).toBe(true)
    expect(slider.isSelectionPaused).toBe(true)
    expect(selectedA3(dataSet)).toEqual([2, 3, 4])
  })

  it("adopts only a matching selection, without writing", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    setSelectedCases([2, 3, 4].map(v => idOf(dataSet, v)), dataSet)
    const changes = dataSet.selectionChanges
    slider.adoptSelectionIfMatching()
    expect(slider.ownsSelection).toBe(true)
    expect(dataSet.selectionChanges).toBe(changes)

    slider.releaseSelection()
    setSelectedCases([idOf(dataSet, 5)], dataSet)
    slider.adoptSelectionIfMatching()
    expect(slider.ownsSelection).toBe(false)
    expect(selectedA3(dataSet)).toEqual([5])
  })

  it("release leaves the selection alone", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    slider.releaseSelection()
    expect(slider.ownsSelection).toBe(false)
    expect(selectedA3(dataSet)).toEqual([2, 3, 4])
  })

  it("selects date cases at both inclusive ends", async () => {
    const { content, slider } = await setupSliderAndData()
    const dates = addDates(content, ["2020-01-01", "2020-06-15", "2020-12-31"])
    slider.setSliderType("selection")
    slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
    const [first, last] = slider.axis.domain
    slider.setRange(first, last)
    slider.resumeSelection()
    expect(dates.selection.size).toBe(3)
  })

  it("parent cases follow the usual all-children rule", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(1, 6)
    slider.resumeSelection()
    dataSet.collections.forEach(collection => {
      collection.caseIds.forEach(caseId => expect(dataSet.isCaseSelected(caseId)).toBe(true))
    })
    slider.setRange(1, 1)
    slider.resumeSelection()
    expect(selectedA3(dataSet)).toEqual([1])
    const parentA = dataSet.collections[0].caseIds
      .find(caseId => dataSet.getStrValue(caseId, dataSet.attrFromName("a1")!.id) === "a")!
    expect(dataSet.isCaseSelected(parentA)).toBe(false)
  })

  it("a variable or visibility slider has no target", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    setSelectedCases([idOf(dataSet, 5)], dataSet)
    slider.setSliderType("visibility")
    expect(slider.selectionTargetItemIds.size).toBe(0)
    slider.resumeSelection()
    slider.setSliderType("variable")
    slider.resumeSelection()
    expect(dataSet.selection.has(idOf(dataSet, 5))).toBe(true)
    expect(slider.ownsSelection).toBe(false)
  })
})

describe("selection slider triggers", () => {
  it("follows the range while owning, including mid-drag", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    slider.setRange(4, 6)
    expect(selectedA3(dataSet)).toEqual([4, 5, 6])
    slider.setDynamicRange(1, 2)
    expect(selectedA3(dataSet)).toEqual([1, 2])
  })

  it("a range change while paused moves the range but not the selection", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    setSelectedCases([idOf(dataSet, 6)], dataSet)
    slider.setRange(1, 3)
    expect(selectedA3(dataSet)).toEqual([6])
    expect(slider.isSelectionPaused).toBe(true)
  })

  it("undo of a range change re-selects only while owning", async () => {
    const { dataSet, slider, tile } = await setupSelectionSlider()
    const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
    const settle = () => when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    const commitRange = (low: number, high: number) =>
      slider.applyModelChange(() => slider.setRange(low, high), rangeChangeOptions(slider, tile))
    appState.document.treeMonitor!.enableMonitoring()
    try {
      await settle()
      commitRange(2, 4)
      await settle()
      slider.resumeSelection()
      commitRange(4, 6)
      await settle()
      expect(selectedA3(dataSet)).toEqual([4, 5, 6])
      appState.document.undoLastAction()
      await settle()
      expect([slider.rangeLow, slider.rangeHigh]).toEqual([2, 4])
      expect(selectedA3(dataSet)).toEqual([2, 3, 4])

      // paused: undo moves the range but leaves the user's selection
      commitRange(4, 6)
      await settle()
      setSelectedCases([idOf(dataSet, 1)], dataSet)
      appState.document.undoLastAction()
      await settle()
      expect([slider.rangeLow, slider.rangeHigh]).toEqual([2, 4])
      expect(selectedA3(dataSet)).toEqual([1])
    }
    finally {
      appState.document.treeMonitor!.disableMonitoring()
    }
  })

  it("drag across an empty region empties the selection and stays owned", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    slider.setRange(1.2, 1.4)
    expect(selectedA3(dataSet)).toEqual([])
    expect(slider.ownsSelection).toBe(true)
    slider.setRange(2, 3)
    expect(selectedA3(dataSet)).toEqual([2, 3])
  })

  it("the last selection slider applied owns the selection", async () => {
    const { content, dataSet, slider: a } = await setupSelectionSlider()
    const b = addSlider(content, dataSet, "selection")
    a.setRange(1, 2)
    a.resumeSelection()
    b.setRange(5, 6)
    b.resumeSelection()
    expect(a.ownsSelection).toBe(false)
    expect(b.ownsSelection).toBe(true)
    a.setRange(3, 4)
    expect(selectedA3(dataSet)).toEqual([5, 6])
  })

  it("releases when the type changes, leaving the selection", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    slider.setSliderType("visibility")
    expect(slider.appliedItemIds).toBeUndefined()
    slider.setSliderType("variable")
    expect(dataSet.selection.size).toBeGreaterThan(0)
  })

  it("releases when a formula is added to the bound attribute, leaving the selection", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    dataSet.attrFromName("a3")!.setDisplayExpression("caseIndex")
    expect(slider.appliedItemIds).toBeUndefined()
    expect(dataSet.selection.size).toBe(3)
  })

  it("releases when the bound attribute is deleted", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    dataSet.removeAttribute(a3Id(dataSet))
    expect(slider.appliedItemIds).toBeUndefined()
    expect(dataSet.selection.size).toBe(3)
  })

  it("releases without throwing when the dataset is removed", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setRange(2, 4)
    slider.resumeSelection()
    expect(() => gDataBroker.removeDataSet(dataSet.id)).not.toThrow()
    expect(slider.appliedItemIds).toBeUndefined()
  })

  it("binding adopts a matching selection without writing", async () => {
    const { dataSet, slider } = await setupSelectionSlider()
    slider.setSliderType("visibility")
    slider.setRange(2, 4)
    setSelectedCases([2, 3, 4].map(v => idOf(dataSet, v)), dataSet)
    const changes = dataSet.selectionChanges
    slider.setSliderType("selection")
    expect(slider.ownsSelection).toBe(true)
    expect(dataSet.selectionChanges).toBe(changes)
  })
})
