import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { DndContext } from "@dnd-kit/core"
import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { TileModelContext } from "../../hooks/use-tile-model-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { appState } from "../../models/app-state"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { TreeManager } from "../../models/history/tree-manager"
import { IDataSet } from "../../models/data/data-set"
import { setSelectedCases } from "../../models/data/data-set-utils"
import { ITileModel } from "../../models/tiles/tile-model"
import { SliderConfigPalette } from "./inspector-panel/slider-config-panel"
import { configureSliderFromAttribute } from "./slider-attribute-drop"
import { SliderComponent } from "./slider-component"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { addDataSetCopy, addDates, setupSliderAndData } from "./slider-test-utils"

const tileSelection: ITileSelection = {
  isTileSelected: () => false,
  selectTile: () => undefined,
  addFocusIgnoreFn: () => () => undefined
}

function renderSlider(tile: ITileModel, isSelected = false) {
  const containerRef = { current: document.body }
  return render(
    <DndContext>
      <TileSelectionContext.Provider value={{ ...tileSelection, isTileSelected: () => isSelected }}>
        <DocumentContainerContext.Provider value={containerRef}>
          <TileModelContext.Provider value={tile}>
            <SliderComponent tile={tile}/>
          </TileModelContext.Provider>
        </DocumentContainerContext.Provider>
      </TileSelectionContext.Provider>
    </DndContext>
  )
}

describe("SliderComponent", () => {
  beforeEach(() => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on", selectionSlider: "on" })
  })

  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  it("shows the value and axis of a variable slider", async () => {
    const { tile } = await setupSliderAndData()
    renderSlider(tile)
    // (its text depends on the axis's length, which jsdom doesn't lay out)
    expect(screen.getByTestId("slider-variable-value-text-input")).toBeInTheDocument()
    expect(screen.getByTestId("slider-axis")).toBeInTheDocument()
    expect(screen.queryByTestId("slider-attribute-prompt")).toBeNull()
  })

  it("shows only the prompt for a range slider with no attribute", async () => {
    const { tile, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    renderSlider(tile)
    expect(screen.getByTestId("slider-attribute-prompt")).toHaveTextContent("Drag an attribute or click here")
    expect(screen.queryByTestId("slider-axis")).toBeNull()
    expect(screen.queryByTestId("slider-play-pause")).toBeNull()
  })

  it("shows the range once an attribute is bound, with its label as the attribute menu", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    renderSlider(tile)
    expect(screen.queryByTestId("slider-attribute-prompt")).toBeNull()
    expect(screen.getByTestId("slider-range-thumb")).toBeInTheDocument()
    expect(screen.getByTestId("slider-axis")).toBeInTheDocument()
    expect(screen.getByTestId("slider-attribute-label"))
      .toContainElement(screen.getByTestId("slider-attribute-menu-button"))
    expect(screen.getByTestId("slider-attribute-menu-button")).toHaveTextContent("a3")
  })

  it("labels the axis with the attribute's name and units, which are also the menu button's accessible name",
      async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    dataSet.attrFromName("a3")!.setUnits("cm")
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    renderSlider(tile)
    expect(screen.getByTestId("slider-attribute-label")).toHaveTextContent(/^a3 \(cm\)$/)
    expect(screen.getByRole("button", { name: "a3 (cm)" })).toBe(screen.getByTestId("slider-attribute-menu-button"))
  })

  it("names the prompt's menu button with its visible text", async () => {
    const { tile, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    renderSlider(tile)
    expect(screen.getByRole("button", { name: "Drag an attribute or click here" }))
      .toBe(screen.getByTestId("slider-attribute-menu-button"))
  })

  it("doesn't let a press on the attribute label move the range", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(3, 4)
    renderSlider(tile)
    const button = screen.getByTestId("slider-attribute-menu-button")
    // a press the track would take as a press near its high end, moving the nearest handle there
    fireEvent.pointerDown(button, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 1000, clientY: 0 })
    fireEvent.pointerUp(button, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 1000, clientY: 0 })
    fireEvent.mouseDown(button, { button: 0, clientX: 1000 })
    fireEvent.mouseUp(button, { button: 0, clientX: 1000 })
    expect([slider.rangeLow, slider.rangeHigh]).toEqual([3, 4])
  })

  it("moves focus to the attribute label's menu once an attribute is chosen from the prompt", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    renderSlider(tile)
    await userEvent.click(screen.getByTestId("slider-attribute-menu-button"))
    // only collection3 has numeric attributes, so they're listed directly (hidden in jsdom; see the menu's tests)
    const items = await screen.findAllByRole("menuitem", { hidden: true })
    await userEvent.click(items.find(item => item.textContent === "a3")!)
    expect(slider.attributeId).toBe(dataSet.attrFromName("a3")!.id)
    // the prompt's button is gone, so this is the attribute label's
    await waitFor(() => {
      expect(screen.getByTestId("slider-attribute-menu-button")).toHaveFocus()
    })
    expect(screen.getByTestId("slider-attribute-label")).toContainElement(
      screen.getByTestId("slider-attribute-menu-button"))
  })

  it("stops playback when the prompt replaces the controls, so binding again doesn't restart it", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    renderSlider(tile)
    fireEvent.click(screen.getByTestId("slider-play-pause"))
    expect(screen.getByTestId("slider-play-pause")).toHaveClass("running")
    act(() => dataSet.removeAttribute(dataSet.attrFromName("a3")!.id))
    expect(screen.getByTestId("slider-attribute-prompt")).toBeInTheDocument()
    act(() => { slider.configureFromAttribute(dataSet, dataSet.attrFromName("a4")!.id) })
    expect(screen.getByTestId("slider-play-pause")).toHaveClass("paused")
  })

  it("marks itself selected while its tile is, which shows its menu's caret", async () => {
    const { tile } = await setupSliderAndData()
    const { unmount } = renderSlider(tile)
    expect(screen.getByTestId("slider")).not.toHaveClass("tile-selected")
    unmount()
    renderSlider(tile, true)
    expect(screen.getByTestId("slider")).toHaveClass("tile-selected")
  })

  it("uses the shared attribute-label caret", async () => {
    const { tile, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    renderSlider(tile)
    expect(within(screen.getByTestId("slider-attribute-menu-button")).getByTestId("attribute-label-caret"))
      .toBeInTheDocument()
  })

  it("returns to the prompt when the bound attribute is deleted", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!
    slider.configureFromAttribute(dataSet, a3.id)
    renderSlider(tile)
    act(() => dataSet.removeAttribute(a3.id))
    expect(screen.getByTestId("slider-attribute-prompt")).toBeInTheDocument()
  })
})

describe("SliderComponent for screen readers", () => {
  beforeEach(() => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on", selectionSlider: "on" })
  })

  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  // the range display's ends, e.g. ["4.8", "6.1"] from "visible value(s) = 4.8 - 6.1"
  function shownRangeEnds() {
    return screen.getByTestId("slider-range-values").textContent.split("=")[1].trim().split(" - ")
  }

  describe("value text", () => {
    it("gives a range's handles their values as the range display shows them, with the attribute's units",
        async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      dataSet.attrFromName("a3")!.setUnits("cm")
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      const [low, high] = shownRangeEnds()
      const [lowHandle, highHandle] = screen.getAllByRole("slider")
      expect(lowHandle).toHaveAttribute("aria-valuetext", `${low} cm`)
      expect(highHandle).toHaveAttribute("aria-valuetext", `${high} cm`)
    })

    it("gives a date range's handles dates, not epoch seconds", async () => {
      const { content, tile, slider } = await setupSliderAndData()
      const dates = addDates(content, ["2005-05-01", "2005-12-31"])
      slider.configureFromAttribute(dates, dates.attrFromName("when")!.id)
      renderSlider(tile)
      const [low, high] = shownRangeEnds()
      expect(low).toBe("5/1/2005")
      const [lowHandle, highHandle] = screen.getAllByRole("slider")
      expect(lowHandle).toHaveAttribute("aria-valuetext", low)
      expect(highHandle).toHaveAttribute("aria-valuetext", high)
    })

    it("gives a variable slider's thumb its value as the slider shows it", async () => {
      const { tile } = await setupSliderAndData()
      renderSlider(tile)
      const shown = screen.getByTestId<HTMLInputElement>("slider-variable-value-text-input").value
      expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", shown)
    })

    it("gives a date variable slider's thumb a date", async () => {
      const { tile, slider } = await setupSliderAndData()
      slider.setScaleType("date")
      renderSlider(tile)
      const shown = screen.getByTestId<HTMLInputElement>("slider-variable-value-text-input").value
      expect(shown).toMatch(/\d+\/\d+\/\d{4}/)
      expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", shown)
    })
  })

  describe("names", () => {
    it("names a variable slider's thumb once, by its variable", async () => {
      const { tile } = await setupSliderAndData()
      renderSlider(tile)
      expect(screen.getByRole("group")).toHaveAccessibleName("v1")
      expect(screen.getByRole("slider")).toHaveAccessibleName("v1")
    })

    it("names a bound range slider by its type, attribute and range, and its handles by their bounds",
        async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      const [low, high] = shownRangeEnds()
      expect(screen.getByRole("group")).toHaveAccessibleName(`Visibility slider, a3, showing ${low} to ${high}`)
      const [lowHandle, highHandle] = screen.getAllByRole("slider")
      expect(lowHandle).toHaveAccessibleName("Lower bound of a3")
      expect(highHandle).toHaveAccessibleName("Upper bound of a3")
    })

    it("names a bound selection slider by what it selects", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.setSliderType("selection")
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      const [low, high] = shownRangeEnds()
      expect(screen.getByRole("group")).toHaveAccessibleName(`Selection slider, a3, selecting ${low} to ${high}`)
    })

    it("includes the attribute's units in the group's name", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      dataSet.attrFromName("a3")!.setUnits("cm")
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      const [low, high] = shownRangeEnds()
      expect(screen.getByRole("group"))
        .toHaveAccessibleName(`Visibility slider, a3, showing ${low} cm to ${high} cm`)
    })

    it("follows the range in the group's name", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      act(() => slider.setRange(3, 4))
      const [low, high] = shownRangeEnds()
      expect(screen.getByRole("group")).toHaveAccessibleName(`Visibility slider, a3, showing ${low} to ${high}`)
    })

    it("names an unbound range slider by its type", async () => {
      const { tile, slider } = await setupSliderAndData()
      slider.setSliderType("selection")
      renderSlider(tile)
      expect(screen.getByRole("group")).toHaveAccessibleName("Selection slider")
    })
  })

  describe("announcements", () => {
    // the slider's own live region (the page has others)
    const status = () => within(screen.getByRole("group")).getByRole("status")

    it("announces nothing when the slider appears", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      expect(status()).toHaveTextContent(/^$/)
    })

    it("announces a type change", async () => {
      const { tile, slider } = await setupSliderAndData()
      renderSlider(tile)
      act(() => slider.setSliderType("visibility"))
      expect(status()).toHaveTextContent("Slider changed to Visibility slider")
    })

    it("announces an attribute set on a range slider", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.setSliderType("selection")
      renderSlider(tile)
      act(() => slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id))
      expect(status()).toHaveTextContent("Attribute set to a3")
      act(() => slider.configureFromAttribute(dataSet, dataSet.attrFromName("a4")!.id))
      expect(status()).toHaveTextContent("Attribute set to a4")
    })

    it("announces the type with an attribute that changed it", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      renderSlider(tile)
      act(() => slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id))
      expect(status()).toHaveTextContent("Visibility slider, attribute set to a3")
    })

    it("announces a bound attribute that's deleted", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      act(() => dataSet.removeAttribute(dataSet.attrFromName("a3")!.id))
      expect(status()).toHaveTextContent("Attribute removed")
    })

    it("announces a bound attribute deleted during playback with the playback's stop", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      fireEvent.click(screen.getByTestId("slider-play-pause"))
      act(() => dataSet.removeAttribute(dataSet.attrFromName("a3")!.id))
      expect(status()).toHaveTextContent("Attribute removed. Slider animation stopped")
    })

    it("announces a change to a range type during playback with the playback's stop", async () => {
      const { tile, slider } = await setupSliderAndData()
      renderSlider(tile)
      fireEvent.click(screen.getByTestId("slider-play-pause"))
      act(() => slider.setSliderType("visibility"))
      expect(status()).toHaveTextContent("Slider changed to Visibility slider. Slider animation stopped")
    })

    it("announces only the stop when playback is paused", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      fireEvent.click(screen.getByTestId("slider-play-pause"))
      fireEvent.click(screen.getByTestId("slider-play-pause"))
      expect(status()).toHaveTextContent(/^Slider animation stopped$/)
    })

    // a menu announces its own choice, so the slider doesn't announce it too
    it("announces nothing for an attribute chosen from the slider's menu", async () => {
      const { tile, slider } = await setupSliderAndData()
      slider.setSliderType("visibility")
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-attribute-menu-button"))
      const items = await screen.findAllByRole("menuitem", { hidden: true })
      await userEvent.click(items.find(item => item.textContent === "a3")!)
      expect(slider.attribute?.name).toBe("a3")
      expect(status()).toHaveTextContent(/^$/)
    })

    it("announces nothing for a type chosen from the Config palette's menu", async () => {
      const { tile, slider } = await setupSliderAndData()
      renderSlider(tile)
      render(<SliderConfigPalette sliderModel={slider} setShowPalette={jest.fn()}/>)
      await userEvent.click(screen.getByTestId("slider-type-button"))
      await userEvent.click(screen.getByRole("option", { name: "Visibility" }))
      expect(slider.sliderType).toBe("visibility")
      // the palette has groups of its own
      expect(within(screen.getByTestId("slider")).getByRole("status")).toHaveTextContent(/^$/)
    })

    it("announces a change after one chosen from a menu", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.setSliderType("visibility")
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-attribute-menu-button"))
      const items = await screen.findAllByRole("menuitem", { hidden: true })
      await userEvent.click(items.find(item => item.textContent === "a3")!)
      act(() => slider.configureFromAttribute(dataSet, dataSet.attrFromName("a4")!.id))
      expect(status()).toHaveTextContent("Attribute set to a4")
    })

    it("announces a change made by undo", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
      renderSlider(tile)
      const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
      const settle = () => when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
      appState.document.treeMonitor!.enableMonitoring()
      try {
        await settle()
        act(() => slider.applyModelChange(() => slider.setSliderType("variable"), {
          undoStringKey: "V3.Undo.slider.changeType", redoStringKey: "V3.Redo.slider.changeType"
        }))
        await settle()
        expect(status()).toHaveTextContent("Slider changed to Variable slider")
        act(() => appState.document.undoLastAction())
        // the undo is applied asynchronously
        await waitFor(() => expect(status()).toHaveTextContent("Visibility slider, attribute set to a3"))
      }
      finally {
        appState.document.treeMonitor!.disableMonitoring()
      }
    })

    it("announces an attribute removed by undo and restored by redo", async () => {
      const { tile, dataSet, slider } = await setupSliderAndData()
      slider.setSliderType("selection")
      renderSlider(tile)
      const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
      const settle = () => when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
      appState.document.treeMonitor!.enableMonitoring()
      try {
        await settle()
        const a3 = dataSet.attrFromName("a3")!.id
        act(() => slider.applyModelChange(() => slider.configureFromAttribute(dataSet, a3), {
          undoStringKey: "V3.Undo.slider.configureFromAttribute", redoStringKey: "V3.Redo.slider.configureFromAttribute"
        }))
        await settle()
        expect(status()).toHaveTextContent("Attribute set to a3")
        act(() => appState.document.undoLastAction())
        // the undo is applied asynchronously
        await waitFor(() => expect(status()).toHaveTextContent("Attribute removed"))
        act(() => appState.document.redoLastAction())
        await waitFor(() => expect(status()).toHaveTextContent("Attribute set to a3"))
      }
      finally {
        appState.document.treeMonitor!.disableMonitoring()
      }
    })
  })
})

describe("SliderComponent: resuming a selection slider", () => {
  beforeEach(() => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on", selectionSlider: "on" })
  })

  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  // a selection slider bound to a3 at [2, 4] that has never owned the selection, so it's paused (a3 = 6 is selected)
  async function setupPausedSelectionSlider() {
    const setup = await setupSliderAndData()
    const { dataSet, slider } = setup
    slider.setSliderType("selection")
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    slider.setRange(2, 4)
    const a3 = dataSet.attrFromName("a3")!.id
    setSelectedCases([dataSet.itemIds.find(itemId => dataSet.getNumeric(itemId, a3) === 6)!], dataSet)
    expect(slider.isSelectionPaused).toBe(true)
    return setup
  }
  const selectedA3 = (dataSet: IDataSet) => {
    const a3 = dataSet.attrFromName("a3")!.id
    return dataSet.itemIds.filter(itemId => dataSet.selection.has(itemId))
      .map(itemId => dataSet.getNumeric(itemId, a3)!).sort((x, y) => x - y)
  }

  it("pressing the paused thumb resumes selection", async () => {
    const { tile, dataSet, slider } = await setupPausedSelectionSlider()
    renderSlider(tile)
    fireEvent.pointerDown(screen.getByTestId("slider-range-body"))
    expect(slider.ownsSelection).toBe(true)
    expect(selectedA3(dataSet)).toEqual([2, 3, 4])
  })

  it("clicking play on a paused slider resumes it at its current range", async () => {
    const { tile, dataSet, slider } = await setupPausedSelectionSlider()
    renderSlider(tile)
    await userEvent.click(screen.getByTestId("slider-play-pause"))
    expect(slider.ownsSelection).toBe(true)
    expect(selectedA3(dataSet)).toContain(2)
    await userEvent.click(screen.getByTestId("slider-play-pause"))
  })

  it("an arrow key on the thumb resumes it; Tab doesn't", async () => {
    const { tile, slider } = await setupPausedSelectionSlider()
    renderSlider(tile)
    const handle = within(screen.getByTestId("slider-range-high")).getByRole("slider")
    fireEvent.keyDown(handle, { key: "Tab" })
    expect(slider.ownsSelection).toBe(false)
    fireEvent.keyDown(handle, { key: "ArrowRight" })
    expect(slider.ownsSelection).toBe(true)
  })

  it("binding an attribute (as a drop or a menu choice does) selects the range", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.setSliderType("selection")
    configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a3")!.id)
    expect(slider.ownsSelection).toBe(true)
    expect(selectedA3(dataSet)).toEqual([1])
  })

  it("switching the type to selection in the Config panel selects the range", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    renderSlider(tile)
    render(<SliderConfigPalette sliderModel={slider} setShowPalette={jest.fn()}/>)
    await userEvent.click(screen.getByTestId("slider-type-button"))
    await userEvent.click(screen.getByRole("option", { name: "Selection" }))
    expect(slider.sliderType).toBe("selection")
    expect(slider.ownsSelection).toBe(true)
    expect(selectedA3(dataSet)).toEqual([1])
  })

  describe("paused indicator and playback", () => {
    const status = () => within(screen.getByTestId("slider")).getByRole("status")

    it("shows the paused badge and class while paused, and clears them on resume", async () => {
      const { tile, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      expect(screen.getByTestId("slider-selection-paused-badge")).toHaveTextContent("Paused")
      expect(screen.getByTestId("slider")).toHaveClass("selection-paused")
      fireEvent.pointerDown(screen.getByTestId("slider-range-body"))
      expect(slider.isSelectionPaused).toBe(false)
      expect(screen.queryByTestId("slider-selection-paused-badge")).not.toBeInTheDocument()
      expect(screen.getByTestId("slider")).not.toHaveClass("selection-paused")
    })

    it("stops playback when another component takes the selection", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-play-pause"))
      expect(screen.getByTestId("slider-play-pause")).toHaveAccessibleName("Pause slider")
      act(() => setSelectedCases([dataSet.itemIds[0]], dataSet))
      expect(slider.ownsSelection).toBe(false)
      expect(screen.getByTestId("slider-play-pause")).toHaveAccessibleName("Play slider")
      // the stop is added to the pause's announcement rather than replacing it
      expect(status()).toHaveTextContent("Selection paused. Slider animation stopped")
    })

    it("keeps playing when the slider is merely stale", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-play-pause"))
      const a3 = dataSet.attrFromName("a3")!.id
      // move a case that isn't selected into the range, which the slider doesn't select until it next moves
      const unselected = dataSet.itemIds.find(itemId => !dataSet.selection.has(itemId))!
      const inRange = (slider.rangeLow + slider.rangeHigh) / 2
      act(() => dataSet.setCaseValues([{ __id__: unselected, [a3]: inRange }]))
      expect(slider.isSelectionPaused).toBe(true)
      expect(slider.ownsSelection).toBe(true)
      expect(screen.getByTestId("slider-play-pause")).toHaveAccessibleName("Pause slider")
      await userEvent.click(screen.getByTestId("slider-play-pause"))
    })

    it("announces pause and resume", async () => {
      const { tile, dataSet } = await setupPausedSelectionSlider()
      renderSlider(tile)
      fireEvent.pointerDown(screen.getByTestId("slider-range-body"))
      expect(status()).toHaveTextContent("Selection resumed")
      act(() => setSelectedCases([dataSet.itemIds[0]], dataSet))
      expect(status()).toHaveTextContent("Selection paused")
    })
  })

  describe("keeping the user's selection", () => {
    const status = () => within(screen.getByTestId("slider")).getByRole("status")

    it("keeps playing when a case it selected is deleted", async () => {
      const { tile, dataSet } = await setupPausedSelectionSlider()
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-play-pause"))
      const selected = dataSet.itemIds.find(itemId => dataSet.selection.has(itemId))!
      act(() => { dataSet.removeCases([selected]) })
      expect(screen.getByTestId("slider-play-pause")).toHaveAccessibleName("Pause slider")
      await userEvent.click(screen.getByTestId("slider-play-pause"))
    })

    it("opening the attribute menu on a paused slider doesn't take the selection", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      fireEvent.pointerDown(screen.getByTestId("slider-attribute-menu-button"))
      expect(slider.ownsSelection).toBe(false)
      expect(selectedA3(dataSet)).toEqual([6])
    })

    it("a right-click or middle-click on a paused slider doesn't take the selection", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      // JSDom has no PointerEvent, so fireEvent would drop the button; polyfill it from MouseEvent for these events
      // only, after rendering, so it doesn't change how React Aria sets up the slider
      const OriginalPointerEvent = window.PointerEvent
      window.PointerEvent = class extends MouseEvent {} as any
      try {
        fireEvent.pointerDown(screen.getByTestId("slider-range-body"), { button: 2 })
        fireEvent.pointerDown(screen.getByTestId("slider-range-body"), { button: 1 })
        expect(slider.ownsSelection).toBe(false)
        expect(selectedA3(dataSet)).toEqual([6])
        fireEvent.pointerDown(screen.getByTestId("slider-range-body"), { button: 0 })
        expect(slider.ownsSelection).toBe(true)
      }
      finally {
        window.PointerEvent = OriginalPointerEvent
      }
    })

    it("Enter on the attribute menu button of a paused slider doesn't take the selection", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      const button = screen.getByTestId("slider-attribute-menu-button")
      act(() => button.focus())
      fireEvent.keyDown(button, { key: "Enter" })
      expect(slider.ownsSelection).toBe(false)
      expect(selectedA3(dataSet)).toEqual([6])
    })

    it("choosing Selection from the Config palette's menu announces nothing, even after a pause", async () => {
      const { tile, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      render(<SliderConfigPalette sliderModel={slider} setShowPalette={jest.fn()}/>)
      await userEvent.click(screen.getByTestId("slider-type-button"))
      await userEvent.click(screen.getByRole("option", { name: "Visibility" }))
      await userEvent.click(screen.getByTestId("slider-type-button"))
      await userEvent.click(screen.getByRole("option", { name: "Selection" }))
      expect(slider.ownsSelection).toBe(true)
      expect(status()).toHaveTextContent(/^$/)
    })

    it("pressing play from the keyboard resumes a paused slider", async () => {
      const { tile, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      act(() => screen.getByTestId("slider-play-pause").focus())
      await userEvent.keyboard("{Enter}")
      expect(slider.ownsSelection).toBe(true)
      await userEvent.click(screen.getByTestId("slider-play-pause"))
    })

    it("a press by a secondary pointer doesn't take the selection", async () => {
      const { tile, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      const OriginalPointerEvent = window.PointerEvent
      window.PointerEvent = class extends MouseEvent {
        isPrimary: boolean
        constructor(type: string, init?: PointerEventInit) {
          super(type, init)
          this.isPrimary = init?.isPrimary ?? true
        }
      } as any
      try {
        fireEvent.pointerDown(screen.getByTestId("slider-range-body"), { button: 0, isPrimary: false })
        expect(slider.ownsSelection).toBe(false)
        // while a primary press does (on the axis, which starts no drag that would need pointer capture)
        fireEvent.pointerDown(screen.getByTestId("slider-axis"), { button: 0, isPrimary: true })
        expect(slider.ownsSelection).toBe(true)
      }
      finally {
        window.PointerEvent = OriginalPointerEvent
      }
    })

    it("binding an attribute on a paused slider, as a drop does, announces the attribute and the resume", async () => {
      const { tile, dataSet } = await setupPausedSelectionSlider()
      renderSlider(tile)
      act(() => { configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a4")!.id) })
      expect(status()).toHaveTextContent("Attribute set to a4. Selection resumed")
    })

    it("keeps playing when an attribute from another dataset is dropped on it", async () => {
      const { content, tile, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-play-pause"))
      expect(slider.ownsSelection).toBe(true)
      const other = addDataSetCopy(content, setupTestDataset().dataset)
      act(() => { configureSliderFromAttribute(tile, other, other.attrFromName("a4")!.id) })
      expect(slider.ownsSelection).toBe(true)
      expect(other.selection.size).toBeGreaterThan(0)
      expect(screen.getByTestId("slider-play-pause")).toHaveAccessibleName("Pause slider")
      expect(status()).not.toHaveTextContent(/stopped|paused/i)
      await userEvent.click(screen.getByTestId("slider-play-pause"))
    })

    it("stopping playback from the keyboard on a stale slider announces only the stop", async () => {
      const { tile, dataSet, slider } = await setupPausedSelectionSlider()
      // slow enough that no playback step re-selects before the stop
      slider.setAnimationRate(0.1)
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-play-pause"))
      const a3 = dataSet.attrFromName("a3")!.id
      const unselected = dataSet.itemIds.find(itemId => !dataSet.selection.has(itemId))!
      act(() => dataSet.setCaseValues([{ __id__: unselected, [a3]: (slider.rangeLow + slider.rangeHigh) / 2 }]))
      expect(slider.isSelectionPaused).toBe(true)
      // by keyboard: a click would be a press on the slider, which resumes it
      act(() => screen.getByTestId("slider-play-pause").focus())
      await userEvent.keyboard("{Enter}")
      expect(screen.getByTestId("slider-play-pause")).toHaveAccessibleName("Play slider")
      expect(status()).toHaveTextContent(/^Slider animation stopped$/)
    })

    it("describes the handles as paused while the slider is paused", async () => {
      const { tile } = await setupPausedSelectionSlider()
      renderSlider(tile)
      const handle = within(screen.getByTestId("slider-range-high")).getByRole("slider")
      expect(handle).toHaveAccessibleDescription(/Selection paused/)
      fireEvent.pointerDown(screen.getByTestId("slider-range-body"))
      expect(handle).not.toHaveAccessibleDescription(/Selection paused/)
    })

    it("choosing an attribute from the slider's menu announces nothing about selection", async () => {
      const { tile, slider } = await setupPausedSelectionSlider()
      renderSlider(tile)
      await userEvent.click(screen.getByTestId("slider-attribute-menu-button"))
      const items = await screen.findAllByRole("menuitem", { hidden: true })
      await userEvent.click(items.find(item => item.textContent === "a4")!)
      expect(slider.ownsSelection).toBe(true)
      expect(status()).not.toHaveTextContent("Selection")
    })
  })
})

