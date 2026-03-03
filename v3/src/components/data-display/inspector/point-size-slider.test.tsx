import { render, screen } from "@testing-library/react"
import { PointSizeSlider } from "./point-size-slider"

// Mock translation to return the key
jest.mock("../../../utilities/translation/translate", () => ({
  t: (key: string) => key
}))

const createMockDescription = (overrides?: Record<string, unknown>) => ({
  pointSizeMultiplier: 1,
  setDynamicPointSizeMultiplier: jest.fn(),
  setPointSizeMultiplier: jest.fn(),
  applyModelChange: jest.fn((fn: () => void) => fn()),
  ...overrides
})

describe("PointSizeSlider", () => {
  it("renders with label and slider", () => {
    const desc = createMockDescription()
    render(<PointSizeSlider displayItemDescription={desc as any} />)

    expect(screen.getByText("DG.Inspector.pointSize")).toBeInTheDocument()
    expect(screen.getByRole("slider")).toBeInTheDocument()
  })

  it("has correct aria-label", () => {
    const desc = createMockDescription()
    render(<PointSizeSlider displayItemDescription={desc as any} />)

    const group = screen.getByRole("group", { name: "DG.Inspector.pointSize" })
    expect(group).toBeInTheDocument()
  })

  it("is disabled when pointDisplayType is bars", () => {
    const desc = createMockDescription()
    render(<PointSizeSlider displayItemDescription={desc as any} pointDisplayType="bars" />)

    // React Aria puts data-disabled on the Slider group element
    const sliderGroup = screen.getByTestId("point-size-slider")
    expect(sliderGroup).toHaveAttribute("data-disabled", "true")
  })

  it("is not disabled when pointDisplayType is points", () => {
    const desc = createMockDescription()
    render(<PointSizeSlider displayItemDescription={desc as any} pointDisplayType="points" />)

    const sliderGroup = screen.getByTestId("point-size-slider")
    expect(sliderGroup).not.toHaveAttribute("data-disabled")
  })

  it("is not disabled when no pointDisplayType is provided", () => {
    const desc = createMockDescription()
    render(<PointSizeSlider displayItemDescription={desc as any} />)

    const sliderGroup = screen.getByTestId("point-size-slider")
    expect(sliderGroup).not.toHaveAttribute("data-disabled")
  })
})
