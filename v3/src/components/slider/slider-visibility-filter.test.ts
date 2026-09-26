import { when } from "mobx"
import { appState } from "../../models/app-state"
import { DataSet } from "../../models/data/data-set"
import { restoreSetAsideCases } from "../../models/data/data-set-utils"
import { AttributeFormulaAdapter } from "../../models/formula/attribute-formula-adapter"
import { FormulaManager } from "../../models/formula/formula-manager"
import { getFormulaManager } from "../../models/tiles/tile-environment"
import { addDataSetCopy, setupSliderAndData } from "./slider-test-utils"

// the standard test dataset's a3 values are 1..6, so configuring from a3 gives axis [1, 6] and range [1, 1.5]
async function setupVisibilitySlider() {
  const setup = await setupSliderAndData()
  setup.slider.configureFromAttribute(setup.dataSet, setup.dataSet.attrFromName("a3")!.id)
  return setup
}
const a3Values = (setup: Awaited<ReturnType<typeof setupSliderAndData>>) => {
  const a3 = setup.dataSet.attrFromName("a3")!.id
  return setup.dataSet.itemIds.map(itemId => setup.dataSet.getNumeric(itemId, a3)).sort()
}

describe("visibility slider filter", () => {
  it("shows only the cases within the range, inclusive of both ends", async () => {
    const setup = await setupVisibilitySlider()
    expect(a3Values(setup)).toEqual([1])
    setup.slider.setRange(2, 4)
    expect(a3Values(setup)).toEqual([2, 3, 4])
  })

  it("follows the range while it is being dragged", async () => {
    const setup = await setupVisibilitySlider()
    setup.slider.setDynamicRange(5, 6)
    expect(a3Values(setup)).toEqual([5, 6])
  })

  it("keeps a case at the high end despite floating point", async () => {
    const setup = await setupVisibilitySlider()
    // moving a range of width 0.7 to the axis end puts its high end at (6 - 0.7) + 0.7
    setup.slider.setRange(1, 1.7)
    setup.slider.moveRange(10)
    expect(a3Values(setup)).toContain(6)
  })

  it("hides cases with a missing value", async () => {
    const setup = await setupVisibilitySlider()
    const a3 = setup.dataSet.attrFromName("a3")!.id
    const first = setup.dataSet.itemIds[0]
    setup.dataSet.setCaseValues([{ __id__: first, [a3]: "" }])
    setup.slider.setRange(1, 6)
    expect(setup.dataSet.itemIds).not.toContain(first)
    expect(setup.dataSet.itemIds).toHaveLength(5)
  })

  it("restores the cases when the slider stops applying", async () => {
    const setup = await setupVisibilitySlider()
    setup.slider.setSliderType("variable")
    expect(setup.dataSet.itemIds).toHaveLength(6)
  })

  it("restores the cases when the slider tile is deleted", async () => {
    const setup = await setupVisibilitySlider()
    expect(setup.dataSet.itemIds).toHaveLength(1)
    setup.content.deleteTile(setup.tile.id)
    expect(setup.dataSet.itemIds).toHaveLength(6)
  })

  it("never touches the user's set-aside cases", async () => {
    const setup = await setupVisibilitySlider()
    setup.slider.setRange(1, 6)
    const sixth = setup.dataSet.itemIds[5]
    setup.dataSet.hideCasesOrItems([sixth])
    setup.slider.setRange(1, 2)
    expect(setup.dataSet.isItemSetAside(sixth)).toBe(true)
    restoreSetAsideCases(setup.dataSet, undefined, false)
    // restoring shows the set-aside case again only if the slider's range allows it
    expect(setup.dataSet.isItemSetAside(sixth)).toBe(false)
    expect(setup.dataSet.itemIds).not.toContain(sixth)
  })

  it("snaps to values the slider itself is hiding", async () => {
    const setup = await setupVisibilitySlider()
    // only a3 = 1 is visible, but a collapse at 4.4 must still find the data value 4
    setup.slider.setRange(4.4, 4.4)
    expect([setup.slider.rangeLow, setup.slider.rangeHigh]).toEqual([4, 4])
    expect(a3Values(setup)).toEqual([4])
  })

  it("configures from the full extent even while the slider hides cases", async () => {
    const setup = await setupVisibilitySlider()
    // re-dropping the same attribute: the extent must still be [1, 6], not the visible [1, 1]
    setup.slider.configureFromAttribute(setup.dataSet, setup.dataSet.attrFromName("a3")!.id)
    expect(setup.slider.axis.domain).toEqual([1, 6])
  })
})

describe("visibility slider and formula attributes", () => {
  it("can't be configured from an attribute that has a formula", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const idx = dataSet.addAttribute({ name: "idx", formula: { display: "caseIndex" } })
    // give it values (formulas aren't evaluated in this setup), so only the formula can reject it
    dataSet.setCaseValues(dataSet.itemIds.map((__id__, i) => ({ __id__, [idx.id]: i + 1 })))
    expect(slider.configurationExtent(dataSet, idx.id)).toBeUndefined()
  })

  it("stops hiding cases while the bound attribute has a formula, and resumes when it's removed", async () => {
    const setup = await setupVisibilitySlider()
    const a3 = setup.dataSet.attrFromName("a3")!
    expect(setup.dataSet.itemIds).toHaveLength(1)
    a3.setDisplayExpression("caseIndex")
    expect(setup.dataSet.itemIds).toHaveLength(6)
    a3.clearFormula()
    expect(setup.dataSet.itemIds).toHaveLength(1)
  })
})

describe("visibility slider updates", () => {
  it("doesn't regroup the cases when a range change hides the same cases", async () => {
    const setup = await setupVisibilitySlider()
    setup.dataSet.validateCases()
    expect(setup.dataSet.isValidCases).toBe(true)
    // [1, 1.5] and [1, 1.6] both show only a3 = 1
    setup.slider.setRange(1, 1.6)
    expect(setup.dataSet.isValidCases).toBe(true)
    setup.slider.setRange(1, 2)
    expect(setup.dataSet.isValidCases).toBe(false)
  })
})

describe("visibility slider and aggregate formulas", () => {
  // formulas compute only once the attribute formula adapter is registered and installed (app.tsx does this)
  beforeAll(() => AttributeFormulaAdapter.register())

  // formula results live in volatile attribute values, which MobX can't observe, so poll for them
  async function eventually(predicate: () => boolean, timeout = 1000) {
    const start = Date.now()
    while (!predicate()) {
      if (Date.now() - start > timeout) throw new Error("timed out")
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  it("computes aggregates over only the cases within the range", async () => {
    const { content, slider } = await setupSliderAndData()
    const formulaManager = getFormulaManager(appState.document) as FormulaManager
    await when(() => formulaManager.areAdaptersInitialized, { timeout: 1000 })
    // a flat dataset, so mean(v) is over every visible case (in a hierarchy it's per parent case)
    const source = DataSet.create({ name: "flat", collections: [{ name: "Cases" }] })
    source.addAttribute({ name: "v" })
    source.addCases([1, 2, 3, 4, 5, 6].map(v => ({ v })), { canonicalize: true })
    const dataSet = addDataSetCopy(content, source)
    const mean = dataSet.addAttribute({ name: "meanV", formula: { display: "mean(v)" } })
    const meanOf = () => dataSet.getNumeric(dataSet.itemIds[0], mean.id)
    await eventually(() => meanOf() === 3.5)
    expect(meanOf()).toBe(3.5)

    slider.configureFromAttribute(dataSet, dataSet.attrFromName("v")!.id)
    slider.setRange(2, 4)
    await eventually(() => meanOf() === 3)
    expect(meanOf()).toBe(3)
    slider.setRange(5, 6)
    await eventually(() => meanOf() === 5.5)
    expect(meanOf()).toBe(5.5)
    // and back over all the cases once the slider stops applying
    slider.setSliderType("variable")
    await eventually(() => meanOf() === 3.5)
    expect(meanOf()).toBe(3.5)
  })
})
