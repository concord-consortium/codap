import { restoreSetAsideCases } from "./data-set-utils"
import { setupTestDataset } from "../../test/dataset-test-utils"

describe("DataSet slider filters", () => {
  it("hides the items a slider filters out, and restores them when cleared", () => {
    const { dataset } = setupTestDataset()
    const [i0, i1] = dataset.itemIds
    dataset.setSliderFilter("s1", new Set([i0, i1]))
    expect(dataset.itemIds).toHaveLength(4)
    expect(dataset.isItemFilteredOut(i0)).toBe(true)
    expect(dataset.isCaseOrItemHidden(i0)).toBe(true)
    dataset.clearSliderFilter("s1")
    expect(dataset.itemIds).toHaveLength(6)
    expect(dataset.isItemFilteredOut(i0)).toBe(false)
  })

  it("composes filters from several sliders, each clearing only its own", () => {
    const { dataset } = setupTestDataset()
    const [i0, i1, i2] = dataset.itemIds
    dataset.setSliderFilter("s1", new Set([i0, i1]))
    dataset.setSliderFilter("s2", new Set([i1, i2]))
    expect(dataset.itemIds).toHaveLength(3)
    dataset.clearSliderFilter("s1")
    expect(dataset.itemIds).toHaveLength(4)
    expect(dataset.isItemFilteredOut(i1)).toBe(true)
  })

  it("leaves set-aside state alone in both directions", () => {
    const { dataset } = setupTestDataset()
    const [i0, i1] = dataset.itemIds
    dataset.hideCasesOrItems([i0])
    dataset.setSliderFilter("s1", new Set([i1]))
    expect(dataset.setAsideItemIds).toEqual([i0])
    // restoring set-aside cases doesn't reveal what the slider hides
    restoreSetAsideCases(dataset, undefined, false)
    expect(dataset.isItemSetAside(i0)).toBe(false)
    expect(dataset.isItemFilteredOut(i1)).toBe(true)
    // and clearing the slider filter doesn't touch set-asides
    dataset.hideCasesOrItems([i0])
    dataset.clearSliderFilter("s1")
    expect(dataset.isItemSetAside(i0)).toBe(true)
  })

  it("lists item ids ignoring slider filters but not set-asides", () => {
    const { dataset } = setupTestDataset()
    const [i0, i1] = dataset.itemIds
    dataset.hideCasesOrItems([i0])
    dataset.setSliderFilter("s1", new Set([i1]))
    expect(dataset.itemIdsIgnoringSliderFilters).toHaveLength(5)
    expect(dataset.itemIdsIgnoringSliderFilters).toContain(i1)
    expect(dataset.itemIdsIgnoringSliderFilters).not.toContain(i0)
  })

  it("excludes slider-filtered items from new items appended to the cache", () => {
    const { dataset } = setupTestDataset()
    dataset.setSliderFilter("s1", new Set(["NEW"]))
    dataset.addCases([{ __id__: "NEW", a3: 7 }], { canonicalize: true })
    dataset.validateCases()
    expect(dataset.itemIds).not.toContain("NEW")
  })

  it("stores the slider's set as given, without copying it", () => {
    const { dataset } = setupTestDataset()
    const hidden = new Set([dataset.itemIds[0]])
    dataset.setSliderFilter("s1", hidden)
    expect(dataset.sliderFilteredOutItemIds.get("s1")).toBe(hidden)
  })

  it("sets aside a case's hidden children along with its visible ones", () => {
    const { dataset, c1 } = setupTestDataset()
    // a1 is "a" for items 0, 2, 4; the slider hides item 0
    const [i0, , i2] = dataset.itemIds
    dataset.setSliderFilter("s1", new Set([i0]))
    dataset.validateCases()
    const parentA = c1.caseIds.find(caseId => dataset.caseInfoMap.get(caseId)?.childItemIds.includes(i2))!
    dataset.hideCasesOrItems([parentA])
    // widening the slider must not bring item 0 back under its set-aside parent
    dataset.clearSliderFilter("s1")
    expect(dataset.isItemSetAside(i0)).toBe(true)
    expect(dataset.itemIds).not.toContain(i0)
  })
})
