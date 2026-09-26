import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { TreeManager } from "../../models/history/tree-manager"
import { getTileDataSet } from "../../models/shared/shared-data-tile-utils"
import { configureSliderFromAttribute, isSliderAttributeDropAllowed } from "./slider-attribute-drop"
import { setupSliderAndData } from "./slider-test-utils"

describe("isSliderAttributeDropAllowed", () => {
  afterEach(() => featureFlagManager.setServerConfig({}))

  it("rejects every drop when the flag is off, even onto an existing range slider", async () => {
    const { dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!.id
    expect(isSliderAttributeDropAllowed(slider, dataSet, a3)).toBe(false)
    slider.setSliderType("visibility")
    expect(isSliderAttributeDropAllowed(slider, dataSet, a3)).toBe(false)
  })

  it("accepts numeric attributes onto a variable slider when visibilitySlider is on", async () => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
    const { dataSet, slider } = await setupSliderAndData()
    expect(isSliderAttributeDropAllowed(slider, dataSet, dataSet.attrFromName("a3")!.id)).toBe(true)
    expect(isSliderAttributeDropAllowed(slider, dataSet, dataSet.attrFromName("a1")!.id)).toBe(false)
    expect(isSliderAttributeDropAllowed(slider, undefined, "x")).toBe(false)
  })

  it("rejects a numeric attribute with no values, since it can't configure the slider", async () => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
    const { dataSet, slider } = await setupSliderAndData()
    const empty = dataSet.addAttribute({ name: "empty", userType: "numeric" })
    expect(isSliderAttributeDropAllowed(slider, dataSet, empty.id)).toBe(false)
  })

  it("rejects an attribute that has a formula", async () => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
    const { dataSet, slider } = await setupSliderAndData()
    const idx = dataSet.addAttribute({ name: "idx", formula: { display: "caseIndex" } })
    // give it values (formulas aren't evaluated in this setup), so only the formula can reject it
    dataSet.setCaseValues(dataSet.itemIds.map((__id__, i) => ({ __id__, [idx.id]: i + 1 })))
    expect(isSliderAttributeDropAllowed(slider, dataSet, idx.id)).toBe(false)
  })

  it("gates a drop onto a selection slider on selectionSlider", async () => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
    const { dataSet, slider } = await setupSliderAndData()
    slider.setSliderType("selection")
    const a3 = dataSet.attrFromName("a3")!.id
    expect(isSliderAttributeDropAllowed(slider, dataSet, a3)).toBe(false)
    featureFlagManager.setServerConfig({ selectionSlider: "on" })
    expect(isSliderAttributeDropAllowed(slider, dataSet, a3)).toBe(true)
  })
})

describe("configureSliderFromAttribute", () => {
  it("sets the title to the childmost collection and undoes as one step", async () => {
    const { dataSet, tile, slider } = await setupSliderAndData()
    const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
    appState.document.treeMonitor!.enableMonitoring()
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    const titleBefore = tile.title

    expect(configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a3")!.id)).toBe(true)
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    expect(slider.sliderType).toBe("visibility")
    expect(tile.title).toBe(dataSet.childCollection.title)
    expect(getTileDataSet(slider)).toBe(dataSet)

    appState.document.undoLastAction()
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    expect(slider.sliderType).toBe("variable")
    expect(slider.dataSetId).toBeUndefined()
    expect(slider.axis.domain).toEqual([-0.5, 11.5])
    expect(tile.title).toBe(titleBefore)
    expect(getTileDataSet(slider)).toBeUndefined()
    appState.document.treeMonitor!.disableMonitoring()
  })

  it("records nothing for an attribute with no values", async () => {
    const { dataSet, tile } = await setupSliderAndData()
    const empty = dataSet.addAttribute({ name: "empty", userType: "numeric" })
    const canUndoBefore = appState.document.canUndo
    expect(configureSliderFromAttribute(tile, dataSet, empty.id)).toBe(false)
    expect(appState.document.canUndo).toBe(canUndoBefore)
  })
})
