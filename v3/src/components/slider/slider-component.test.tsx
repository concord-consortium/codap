import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { DndContext } from "@dnd-kit/core"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { TileModelContext } from "../../hooks/use-tile-model-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { ITileModel } from "../../models/tiles/tile-model"
import { SliderComponent } from "./slider-component"
import { setupSliderAndData } from "./slider-test-utils"

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
    expect(screen.getByTestId("slider-drop-overlay")).not.toHaveClass("tile-selected")
    unmount()
    renderSlider(tile, true)
    expect(screen.getByTestId("slider-drop-overlay")).toHaveClass("tile-selected")
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
