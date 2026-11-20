import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ISerializedActionCall, onAction } from "mobx-state-tree"
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
    const slider = screen.getByRole("slider", { name: "V3.Inspector.map.hotSpotOpacity" })
    expect(slider).toHaveAttribute("aria-valuetext", "75%")
    expect(screen.getByTestId("map-hot-spot-opacity-slider")).toHaveAttribute("data-disabled", "true")
  })

  it("commits the opacity when the slider change ends", async () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const user = userEvent.setup()
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    pointLayer.hotSpotModel.setIsVisible(true)
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider", { name: "V3.Inspector.map.hotSpotOpacity" })
    expect(screen.getByTestId("map-hot-spot-opacity-slider")).not.toHaveAttribute("data-disabled")
    act(() => slider.focus())
    await user.keyboard("{ArrowRight}")
    expect(pointLayer.hotSpotModel.opacity).toBeCloseTo(0.76)
    expect(pointLayer.hotSpotModel.dynamicOpacity).toBeUndefined()
    expect(slider).toHaveAttribute("aria-valuetext", "76%")
  })

  it("doesn't change the model when the opacity is released at the committed value", async () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const user = userEvent.setup()
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    // full opacity is the slider's maximum, so pressing End doesn't move it
    hotSpotModel.setOpacity(1)
    // as if the slider had been dragged away and back
    hotSpotModel.setDynamicOpacity(1)
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    const slider = screen.getByRole("slider", { name: "V3.Inspector.map.hotSpotOpacity" })
    act(() => slider.focus())
    await user.keyboard("{End}")
    disposer()

    // committing an opacity is a single applyModelChange action, which wraps setOpacity
    expect(actions.map(({ name }) => name)).not.toContain("applyModelChange")
    expect(hotSpotModel.opacity).toBe(1)
    expect(hotSpotModel.dynamicOpacity).toBeUndefined()
  })

  it("commits an in-progress opacity when the slider loses focus", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider", { name: "V3.Inspector.map.hotSpotOpacity" })
    act(() => slider.focus())
    // as if focus left in the middle of a change
    act(() => hotSpotModel.setDynamicOpacity(0.4))
    act(() => slider.blur())
    expect(hotSpotModel.opacity).toBe(0.4)
    expect(hotSpotModel.dynamicOpacity).toBeUndefined()
  })

  it("doesn't change the model when the opacity slider loses focus with no change in progress", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    const slider = screen.getByRole("slider", { name: "V3.Inspector.map.hotSpotOpacity" })
    act(() => slider.focus())
    act(() => slider.blur())
    disposer()
    expect(actions).toEqual([])
    expect(hotSpotModel.opacity).toBe(0.75)
  })

  it("renders the resolution slider above the opacity slider", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)

    const [first, second] = screen.getAllByRole("slider")
    expect(first).toHaveAccessibleName("V3.Inspector.map.hotSpotResolution")
    expect(second).toHaveAccessibleName("V3.Inspector.map.hotSpotOpacity")
  })
})
