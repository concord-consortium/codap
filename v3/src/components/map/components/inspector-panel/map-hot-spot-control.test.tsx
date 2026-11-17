import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { featureFlagManager } from "../../../../models/feature-flags/feature-flag-manager"
import { AppHistoryService } from "../../../../models/history/app-history-service"
import { MapPointLayerModel } from "../../models/map-point-layer-model"
import { MapHotSpotControl } from "./map-hot-spot-control"

jest.mock("../../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
  translate: (key: string) => key
}))

describe("MapHotSpotControl", () => {
  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  it("renders nothing when the mapHotSpot flag is off", () => {
    const { container } = render(<MapHotSpotControl mapPointLayerModel={MapPointLayerModel.create()}/>)
    expect(container.innerHTML).toBe("")
  })

  it("renders nothing without a point layer, even when the flag is on", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { container } = render(<MapHotSpotControl/>)
    expect(container.innerHTML).toBe("")
  })

  it("toggles the hot spot when the flag is on", async () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const user = userEvent.setup()
    // applyModelChange requires a history service in the MST environment
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    const checkbox = screen.getByRole("checkbox", { name: "V3.Inspector.map.hotSpot" })
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(pointLayer.hotSpotModel.isVisible).toBe(true)
    expect(checkbox).toBeChecked()
  })

  it("renders an accessible opacity slider that is disabled while the hot spot is hidden", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    expect(screen.getByRole("group", { name: "V3.Inspector.map.hotSpotOpacity" })).toBeInTheDocument()
    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("aria-valuetext", "75%")
    expect(screen.getByTestId("map-hot-spot-opacity-slider")).toHaveAttribute("data-disabled", "true")
  })

  it("commits the opacity when the slider change ends", async () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const user = userEvent.setup()
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    pointLayer.hotSpotModel.setIsVisible(true)
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider")
    expect(screen.getByTestId("map-hot-spot-opacity-slider")).not.toHaveAttribute("data-disabled")
    act(() => slider.focus())
    await user.keyboard("{ArrowRight}")
    expect(pointLayer.hotSpotModel.opacity).toBeCloseTo(0.76)
    expect(pointLayer.hotSpotModel.dynamicOpacity).toBeUndefined()
    expect(slider).toHaveAttribute("aria-valuetext", "76%")
  })
})
