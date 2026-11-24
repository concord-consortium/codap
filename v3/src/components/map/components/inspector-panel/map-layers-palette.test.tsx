import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AppHistoryService } from "../../../../models/history/app-history-service"
import { MapContentModel } from "../../models/map-content-model"
import { IMapPinLayerModel, MapPinLayerModel } from "../../models/map-pin-layer-model"
import { IMapPointLayerModel, MapPointLayerModel } from "../../models/map-point-layer-model"
import { MapLayersPalette } from "./map-layers-palette"

jest.mock("../../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
  translate: (key: string) => key
}))

describe("MapLayersPalette", () => {
  let pointLayer: IMapPointLayerModel
  let pinLayer: IMapPinLayerModel

  const renderPalette = () => {
    // applyModelChange requires a history service in the MST environment
    const mapModel = MapContentModel.create(
      { layers: [MapPointLayerModel.create(), MapPinLayerModel.create()] },
      { historyService: new AppHistoryService() }
    )
    pointLayer = mapModel.layers[0] as IMapPointLayerModel
    pinLayer = mapModel.layers[1] as IMapPinLayerModel
    render(<MapLayersPalette tile={{ content: mapModel } as any} setShowPalette={jest.fn()}/>)
  }

  // The controls for one layer: its visibility checkbox and the sections beneath it.
  const layerControls = (layerId: string) =>
    // eslint-disable-next-line testing-library/no-node-access
    screen.getByTestId(`map-layers-checkbox-layer-${layerId}`).closest(".map-layer-controls") as HTMLElement

  it("has the points, grid, connecting lines, and pins checkboxes in the layer's controls", () => {
    renderPalette()

    const pointControls = within(layerControls(pointLayer.id))
    expect(pointControls.getByTestId(`map-layers-checkbox-points-${pointLayer.id}`)).toBeInTheDocument()
    expect(pointControls.getByTestId(`map-layers-checkbox-grid-${pointLayer.id}`)).toBeInTheDocument()
    expect(pointControls.getByTestId(`map-layers-checkbox-lines-${pointLayer.id}`)).toBeInTheDocument()
    expect(pointControls.queryByTestId(`map-layers-checkbox-pins-${pinLayer.id}`)).not.toBeInTheDocument()

    const pinControls = within(layerControls(pinLayer.id))
    expect(pinControls.getByTestId(`map-layers-checkbox-pins-${pinLayer.id}`)).toBeInTheDocument()
    expect(pinControls.queryByRole("checkbox", { name: "DG.Inspector.mapPoints" })).not.toBeInTheDocument()
  })

  it("orders a point layer's sections Points, then Grid and Connecting Lines at the bottom", () => {
    renderPalette()

    // Each section is its own palette-form directly beneath the layer's controls.
    // eslint-disable-next-line testing-library/no-node-access
    const sections = Array.from(layerControls(pointLayer.id).querySelectorAll(":scope > .palette-form"))
    const sectionOf = (testId: string) =>
      // eslint-disable-next-line testing-library/no-node-access
      sections.findIndex(section => section.querySelector(`[data-testid="${testId}"]`))

    const pointsIndex = sectionOf(`map-layers-checkbox-points-${pointLayer.id}`)
    const gridIndex = sectionOf(`map-layers-checkbox-grid-${pointLayer.id}`)
    const linesIndex = sectionOf(`map-layers-checkbox-lines-${pointLayer.id}`)
    expect(pointsIndex).toBe(0)
    expect(gridIndex).toBe(sections.length - 2)
    expect(linesIndex).toBe(sections.length - 1)
  })

  it("puts Grid, Connecting Lines, and Pins each in a section of its own", () => {
    renderPalette()

    for (const testId of [
      `map-layers-checkbox-grid-${pointLayer.id}`,
      `map-layers-checkbox-lines-${pointLayer.id}`,
      `map-layers-checkbox-pins-${pinLayer.id}`
    ]) {
      // eslint-disable-next-line testing-library/no-node-access
      const section = screen.getByTestId(testId).closest(".palette-form")
      expect(section).toHaveClass("palette-form")
      // eslint-disable-next-line testing-library/no-node-access
      expect(section?.querySelectorAll(".react-aria-Checkbox")).toHaveLength(1)
    }
  })

  it("shows and hides the layer's points", async () => {
    const user = userEvent.setup()
    renderPalette()

    const checkbox = screen.getByTestId(`map-layers-checkbox-points-${pointLayer.id}`)
    expect(checkbox).toHaveAttribute("data-selected", "true")
    await user.click(checkbox)
    expect(pointLayer.pointsAreVisible).toBe(false)
    expect(checkbox).not.toHaveAttribute("data-selected")
    await user.click(checkbox)
    expect(pointLayer.pointsAreVisible).toBe(true)
  })

  it("shows and hides the layer's grid", async () => {
    const user = userEvent.setup()
    renderPalette()

    const checkbox = screen.getByTestId(`map-layers-checkbox-grid-${pointLayer.id}`)
    expect(pointLayer.gridModel.isVisible).toBe(false)
    await user.click(checkbox)
    expect(pointLayer.gridModel.isVisible).toBe(true)
    expect(checkbox).toHaveAttribute("data-selected", "true")
    await user.click(checkbox)
    expect(pointLayer.gridModel.isVisible).toBe(false)
  })

  it("shows and hides the layer's connecting lines", async () => {
    const user = userEvent.setup()
    renderPalette()

    const checkbox = screen.getByTestId(`map-layers-checkbox-lines-${pointLayer.id}`)
    expect(pointLayer.connectingLinesAreVisible).toBe(false)
    await user.click(checkbox)
    expect(pointLayer.connectingLinesAreVisible).toBe(true)
    await user.click(checkbox)
    expect(pointLayer.connectingLinesAreVisible).toBe(false)
  })

  it("shows and hides the layer's pins", async () => {
    const user = userEvent.setup()
    renderPalette()

    const checkbox = screen.getByTestId(`map-layers-checkbox-pins-${pinLayer.id}`)
    expect(pinLayer.pinsAreVisible).toBe(true)
    await user.click(checkbox)
    expect(pinLayer.pinsAreVisible).toBe(false)
    await user.click(checkbox)
    expect(pinLayer.pinsAreVisible).toBe(true)
  })

  it("disables the point formatting options while the layer's points are hidden", async () => {
    const user = userEvent.setup()
    renderPalette()

    const strokeSameAsFill = screen.getByRole("checkbox", { name: "DG.Inspector.strokeSameAsFill" })
    expect(strokeSameAsFill).toBeEnabled()

    await user.click(screen.getByTestId(`map-layers-checkbox-points-${pointLayer.id}`))
    expect(strokeSameAsFill).toBeDisabled()
    // The other sections are independent of the points' visibility.
    expect(within(screen.getByTestId(`map-layers-checkbox-grid-${pointLayer.id}`)).getByRole("checkbox"))
      .toBeEnabled()
    expect(within(screen.getByTestId(`map-layers-checkbox-lines-${pointLayer.id}`)).getByRole("checkbox"))
      .toBeEnabled()
  })
})
