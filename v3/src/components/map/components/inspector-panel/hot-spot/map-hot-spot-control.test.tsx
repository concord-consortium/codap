import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ISerializedActionCall, onAction } from "mobx-state-tree"
import { featureFlagManager } from "../../../../../models/feature-flags/feature-flag-manager"
import { AppHistoryService } from "../../../../../models/history/app-history-service"
import { MapPointLayerModel } from "../../../models/map-point-layer-model"
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

  // Opacity slider

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

  // Color Ramp Select

  function mountShownHotSpot() {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    pointLayer.hotSpotModel.setIsVisible(true)
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)
    return pointLayer.hotSpotModel
  }
  const rampButton = () => screen.getByTestId("map-hot-spot-color-ramp-button")
  const lowSwatch = () => screen.getByTestId("color-swatch-button-hot-spot-low")
  const highSwatch = () => screen.getByTestId("color-swatch-button-hot-spot-high")
  // eslint-disable-next-line testing-library/no-node-access -- the strip is decorative, so it has no role or text
  const rampStrip = (element: HTMLElement) => element.querySelector<HTMLElement>(".hot-spot-ramp-strip")

  it("shows the selected color ramp with its preview strip", () => {
    mountShownHotSpot()
    expect(rampButton()).toHaveTextContent("V3.Inspector.map.hotSpotColorRamp.heat")
    const strip = rampStrip(rampButton())
    expect(strip).toHaveAttribute("aria-hidden", "true")
    expect(strip?.style.background).toMatch(/^linear-gradient\(to right, #000004, /)
  })

  it("lists the color ramps in order, each with a preview strip", async () => {
    const user = userEvent.setup()
    mountShownHotSpot()
    await user.click(rampButton())
    const options = screen.getAllByRole("option")
    expect(options.map(option => option.textContent)).toEqual(
      ["heat", "viridis", "cividis", "monochrome", "custom"].map(ramp => `V3.Inspector.map.hotSpotColorRamp.${ramp}`))
    options.forEach(option => expect(rampStrip(option)).toBeInTheDocument())
  })

  it("changes the color ramp", async () => {
    const user = userEvent.setup()
    const hotSpotModel = mountShownHotSpot()
    await user.click(rampButton())
    await user.click(screen.getByRole("option", { name: "V3.Inspector.map.hotSpotColorRamp.viridis" }))
    expect(hotSpotModel.colorRamp).toBe("viridis")
    expect(rampButton()).toHaveTextContent("V3.Inspector.map.hotSpotColorRamp.viridis")
  })

  it("disables the color ramp menu while the hot spot is hidden", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)
    expect(rampButton()).toBeDisabled()
    expect(lowSwatch()).toBeDisabled()
    expect(highSwatch()).toBeDisabled()
  })

  it("enables the low and high colors only for the custom ramp", () => {
    const hotSpotModel = mountShownHotSpot()
    expect(lowSwatch()).toBeDisabled()
    expect(highSwatch()).toBeDisabled()
    act(() => hotSpotModel.setColorRamp("custom"))
    expect(lowSwatch()).toBeEnabled()
    expect(highSwatch()).toBeEnabled()
    expect(lowSwatch()).toHaveAccessibleName("V3.Inspector.map.hotSpotLowColor: #5b1a8c")
    expect(highSwatch()).toHaveAccessibleName("V3.Inspector.map.hotSpotHighColor: #fff3a3")
  })

  it("shows the custom colors in the custom ramp's preview strip", () => {
    const hotSpotModel = mountShownHotSpot()
    act(() => {
      hotSpotModel.setColorRamp("custom")
      hotSpotModel.setLowColor("#000000")
    })
    expect(rampStrip(rampButton())?.style.background)
      .toMatch(/^linear-gradient\(to right, rgb\(0, 0, 0\), /)
  })

  // Color binning slider

  it("renders the color binning slider last, below the high color", () => {
    mountShownHotSpot()
    const sliders = screen.getAllByRole("slider")
    expect(sliders).toHaveLength(3)
    const binningSlider = sliders[2]
    expect(binningSlider).toHaveAccessibleName("V3.Inspector.map.hotSpotColorBinning")
    expect(highSwatch().compareDocumentPosition(binningSlider)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("commits the color bins from the color binning slider", async () => {
    const user = userEvent.setup()
    const hotSpotModel = mountShownHotSpot()
    expect(hotSpotModel.colorBins).toBe("continuous")
    const slider = screen.getByRole("slider", { name: "V3.Inspector.map.hotSpotColorBinning" })
    act(() => slider.focus())
    await user.keyboard("{Home}")
    expect(hotSpotModel.colorBins).toBe(2)
  })
})
