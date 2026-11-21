import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ISerializedActionCall, onAction } from "mobx-state-tree"
import { AppHistoryService } from "../../../../models/history/app-history-service"
import { MapPointLayerModel } from "../../models/map-point-layer-model"
import { formatColorBins, MapHotSpotBinningSlider } from "./map-hot-spot-binning-slider"

// Includes any variables after the key, so tests can see the count in "n classes"
jest.mock("../../../../utilities/translation/translate", () => {
  const t = (key: string, options?: { vars?: unknown[] }) =>
    options?.vars ? `${key}:${options.vars.join(",")}` : key
  return { t, translate: t }
})

const kLabel = "V3.Inspector.map.hotSpotColorBinning"
const kContinuous = "V3.Inspector.map.hotSpotColorBinning.continuous"
const classes = (count: number) => `V3.Inspector.map.hotSpotColorBinning.classes:${count}`

// applyModelChange requires a history service in the MST environment
const createPointLayer = () => MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })

function mountShownSlider() {
  const pointLayer = createPointLayer()
  pointLayer.hotSpotModel.setIsVisible(true)
  render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)
  return pointLayer.hotSpotModel
}

describe("formatColorBins", () => {
  it("names the number of classes, or continuous", () => {
    expect(formatColorBins(5)).toBe(classes(5))
    expect(formatColorBins("continuous")).toBe(kContinuous)
  })

  it("names the nearest limit for an out-of-range count", () => {
    expect(formatColorBins(15)).toBe(classes(10))
    expect(formatColorBins(1)).toBe(classes(2))
  })
})

describe("MapHotSpotBinningSlider", () => {
  it("is continuous by default, at the far right, and disabled while the hot spot is hidden", () => {
    render(<MapHotSpotBinningSlider mapPointLayerModel={createPointLayer()}/>)

    expect(screen.getByRole("group", { name: kLabel })).toBeInTheDocument()
    const slider = screen.getByRole("slider", { name: kLabel })
    expect(slider).toHaveAttribute("min", "2")
    expect(slider).toHaveAttribute("max", "11")
    expect(slider).toHaveAttribute("step", "1")
    expect(slider).toHaveAttribute("value", "11")
    expect(slider).toHaveAttribute("aria-valuetext", kContinuous)
    expect(screen.getByTestId("map-hot-spot-color-binning-slider")).toHaveAttribute("data-disabled", "true")
  })

  it("shows the readout below the slider, hidden from screen readers", () => {
    const hotSpotModel = mountShownSlider()
    const readout = screen.getByText(kContinuous)
    expect(readout).toHaveClass("slider-readout")
    expect(readout).toHaveAttribute("aria-hidden", "true")

    act(() => hotSpotModel.setColorBins(5))
    expect(screen.getByText(classes(5))).toHaveClass("slider-readout")
  })

  it("commits the number of classes when the slider change ends", async () => {
    const user = userEvent.setup()
    const hotSpotModel = mountShownSlider()

    const slider = screen.getByRole("slider")
    expect(screen.getByTestId("map-hot-spot-color-binning-slider")).not.toHaveAttribute("data-disabled")
    act(() => slider.focus())
    await user.keyboard("{ArrowLeft}")
    expect(hotSpotModel.colorBins).toBe(10)
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
    expect(slider).toHaveAttribute("aria-valuetext", classes(10))
    expect(screen.getByText(classes(10))).toBeInTheDocument()

    await user.keyboard("{Home}")
    expect(hotSpotModel.colorBins).toBe(2)
    expect(slider).toHaveAttribute("aria-valuetext", classes(2))

    await user.keyboard("{End}")
    expect(hotSpotModel.colorBins).toBe("continuous")
    expect(slider).toHaveAttribute("aria-valuetext", kContinuous)
  })

  it("commits each change as one applyModelChange action", async () => {
    const user = userEvent.setup()
    const hotSpotModel = mountShownSlider()
    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))

    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    await user.keyboard("{ArrowLeft}")
    disposer()

    expect(actions.filter(({ name }) => name === "applyModelChange")).toHaveLength(1)
  })

  it("shows an in-progress value without committing it", () => {
    const hotSpotModel = mountShownSlider()
    act(() => hotSpotModel.setDynamicColorBins(4))

    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("value", "4")
    expect(slider).toHaveAttribute("aria-valuetext", classes(4))
    expect(screen.getByText(classes(4))).toBeInTheDocument()
    expect(hotSpotModel.colorBins).toBe("continuous")
  })

  it("doesn't change the model when released at the committed value", async () => {
    const user = userEvent.setup()
    const pointLayer = createPointLayer()
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    // 2 is the slider's minimum, so pressing Home doesn't move it
    hotSpotModel.setColorBins(2)
    // as if the slider had been dragged away and back
    hotSpotModel.setDynamicColorBins(2)
    render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)

    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    await user.keyboard("{Home}")
    disposer()

    // committing color bins is a single applyModelChange action, which wraps setColorBins
    expect(actions.map(({ name }) => name)).not.toContain("applyModelChange")
    expect(hotSpotModel.colorBins).toBe(2)
    // the in-progress change has ended
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
  })

  it("commits an in-progress value when the slider loses focus", () => {
    const hotSpotModel = mountShownSlider()
    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    // as if focus left in the middle of a change
    act(() => hotSpotModel.setDynamicColorBins(6))
    act(() => slider.blur())
    expect(hotSpotModel.colorBins).toBe(6)
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
  })

  it("doesn't change the model when the slider loses focus with no change in progress", () => {
    const hotSpotModel = mountShownSlider()
    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    act(() => slider.blur())
    disposer()
    expect(actions).toEqual([])
    expect(hotSpotModel.colorBins).toBe("continuous")
  })

  it("shows an out-of-range count as the nearest limit and keeps it until a change is committed", () => {
    const pointLayer = createPointLayer()
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    hotSpotModel.setColorBins(15)
    render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("value", "10")
    expect(slider).toHaveAttribute("aria-valuetext", classes(10))
    expect(screen.getByText(classes(10))).toBeInTheDocument()

    // ending a change at 10, which is what 15 is treated as, commits nothing
    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    act(() => slider.focus())
    act(() => hotSpotModel.setDynamicColorBins(10))
    act(() => slider.blur())
    disposer()
    expect(actions.map(({ name }) => name)).not.toContain("applyModelChange")
    expect(hotSpotModel.colorBins).toBe(15)
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
  })

  it("replaces an out-of-range count when a different value is committed", async () => {
    const user = userEvent.setup()
    const pointLayer = createPointLayer()
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    hotSpotModel.setColorBins(15)
    render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    await user.keyboard("{ArrowLeft}")
    expect(hotSpotModel.colorBins).toBe(9)
  })
})
