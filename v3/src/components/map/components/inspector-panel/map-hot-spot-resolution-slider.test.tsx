import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AppHistoryService } from "../../../../models/history/app-history-service"
import { MapPointLayerModel } from "../../models/map-point-layer-model"
import { kResolutionRangeFactor } from "../../utilities/hot-spot-utils"
import { formatBandwidth, MapHotSpotResolutionSlider } from "./map-hot-spot-resolution-slider"

jest.mock("../../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
  translate: (key: string) => key
}))

// applyModelChange requires a history service in the MST environment
const createPointLayer = () => MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })

describe("formatBandwidth", () => {
  it("uses meters below a kilometer and kilometers above, with two significant digits", () => {
    expect(formatBandwidth(850)).toBe("850 m")
    expect(formatBandwidth(2345)).toBe("2.3 km")
    expect(formatBandwidth(1000000)).toBe("1,000 km")
  })
})

describe("MapHotSpotResolutionSlider", () => {
  it("is centered on the default bandwidth and disabled while the hot spot is hidden", () => {
    render(<MapHotSpotResolutionSlider mapPointLayerModel={createPointLayer()}/>)

    expect(screen.getByRole("group", { name: "V3.Inspector.map.hotSpotResolution" })).toBeInTheDocument()
    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("min", "-1")
    expect(slider).toHaveAttribute("max", "1")
    expect(slider).toHaveAttribute("value", "0")
    // with no points the default is the 10 km fallback, which is announced in place of the slider position
    expect(slider).toHaveAttribute("aria-valuetext", "10 km")
    expect(screen.getByTestId("map-hot-spot-resolution-slider")).toHaveAttribute("data-disabled", "true")
  })

  it("commits a smaller bandwidth when the resolution is increased", async () => {
    const user = userEvent.setup()
    const pointLayer = createPointLayer()
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    render(<MapHotSpotResolutionSlider mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider")
    expect(screen.getByTestId("map-hot-spot-resolution-slider")).not.toHaveAttribute("data-disabled")
    act(() => slider.focus())
    await user.keyboard("{End}")
    expect(hotSpotModel.bandwidth).toBeCloseTo(hotSpotModel.defaultBandwidth / kResolutionRangeFactor)
    expect(hotSpotModel.dynamicBandwidth).toBeUndefined()
    // 10 km / 10^0.45
    expect(slider).toHaveAttribute("aria-valuetext", "3.5 km")
  })

  it("widens the range to include a bandwidth outside the usual range", () => {
    const pointLayer = createPointLayer()
    // the 10 km default times the range factor squared (10^0.9, about 79 km) is at resolution -2
    pointLayer.hotSpotModel.setBandwidth(10000 * kResolutionRangeFactor ** 2)
    render(<MapHotSpotResolutionSlider mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("min", "-2")
    expect(slider).toHaveAttribute("max", "2")
    expect(Number(slider.getAttribute("value"))).toBeCloseTo(-2)
    expect(slider).toHaveAttribute("aria-valuetext", "79 km")
  })
})
