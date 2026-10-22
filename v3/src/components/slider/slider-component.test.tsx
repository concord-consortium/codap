import { act, render, screen } from "@testing-library/react"
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

  it("returns to the prompt when the bound attribute is deleted", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!
    slider.configureFromAttribute(dataSet, a3.id)
    renderSlider(tile)
    act(() => dataSet.removeAttribute(a3.id))
    expect(screen.getByTestId("slider-attribute-prompt")).toBeInTheDocument()
  })
})
