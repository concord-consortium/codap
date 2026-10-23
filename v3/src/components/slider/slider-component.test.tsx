import { act, fireEvent, render, screen } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
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

function renderSlider(tile: ITileModel) {
  const containerRef = { current: document.body }
  return render(
    <DndContext>
      <TileSelectionContext.Provider value={tileSelection}>
        <DocumentContainerContext.Provider value={containerRef}>
          <SliderComponent tile={tile}/>
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
    expect(screen.getByTestId("slider-axis")).toBeInTheDocument()
    expect(screen.getByTestId("slider-attribute-label"))
      .toContainElement(screen.getByTestId("slider-attribute-menu-button"))
    expect(screen.getByTestId("slider-attribute-menu-button")).toHaveTextContent("a3")
  })

  it("labels the axis with exactly the attribute's name, which is also the menu button's accessible name",
      async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    renderSlider(tile)
    expect(screen.getByTestId("slider-attribute-label")).toHaveTextContent(/^a3$/)
    expect(screen.getByRole("button", { name: "a3" })).toBe(screen.getByTestId("slider-attribute-menu-button"))
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

  it("returns to the prompt when the bound attribute is deleted", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!
    slider.configureFromAttribute(dataSet, a3.id)
    renderSlider(tile)
    act(() => dataSet.removeAttribute(a3.id))
    expect(screen.getByTestId("slider-attribute-prompt")).toBeInTheDocument()
  })
})
