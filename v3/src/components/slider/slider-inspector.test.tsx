import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { SliderInspector } from "./slider-inspector"
import { setupSliderAndData } from "./slider-test-utils"

describe("SliderInspector", () => {
  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  it("has no Config button while neither range type is available", async () => {
    const { tile } = await setupSliderAndData()
    render(<SliderInspector tile={tile} show={true}/>)
    expect(screen.queryByTestId("slider-config-button")).toBeNull()
    expect(screen.getByTestId("slider-values-button")).toBeInTheDocument()
  })

  it("puts the Config button first when a range type is available", async () => {
    featureFlagManager.setServerConfig({ selectionSlider: "on" })
    const { tile } = await setupSliderAndData()
    render(<SliderInspector tile={tile} show={true}/>)
    const buttons = screen.getAllByRole("button").map(button => button.getAttribute("data-testid"))
    expect(buttons.slice(0, 3)).toEqual(["slider-config-button", "slider-values-button", "slider-scale-button"])
  })

  it("opens the Configuration palette", async () => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on" })
    const { tile } = await setupSliderAndData()
    render(<SliderInspector tile={tile} show={true}/>)
    await userEvent.click(screen.getByTestId("slider-config-button"))
    expect(screen.getByTestId("slider-type-button")).toBeInTheDocument()
  })
})
