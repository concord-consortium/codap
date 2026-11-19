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
    expect(lowSwatch()).toHaveAccessibleName("V3.Inspector.map.hotSpotLowColor: #fff3a3")
    expect(highSwatch()).toHaveAccessibleName("V3.Inspector.map.hotSpotHighColor: #5b1a8c")
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
})
