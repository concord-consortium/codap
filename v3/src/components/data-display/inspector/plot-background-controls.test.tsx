import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PlotBackgroundControls } from "./plot-background-controls"

// Mock translation to return the key
jest.mock("../../../utilities/translation/translate", () => ({
  t: (key: string) => key
}))

// Mock PointColorSetting to render a simple swatch button
jest.mock("./point-color-setting", () => ({
  PointColorSetting: ({ propertyLabel, swatchBackgroundColor }: any) => (
    <button data-testid={`color-swatch-${propertyLabel}`}
      style={{ backgroundColor: swatchBackgroundColor }}>
      {propertyLabel}
    </button>
  )
}))

describe("PlotBackgroundControls", () => {
  const defaultProps = {
    isTransparent: false,
    onBackgroundTransparencyChange: jest.fn(),
    plotBackgroundColor: "#FF0000",
    onBackgroundColorChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders color picker and transparency checkbox", () => {
    render(<PlotBackgroundControls {...defaultProps} />)

    expect(screen.getByTestId("color-swatch-DG.Inspector.backgroundColor")).toBeInTheDocument()
    expect(screen.getByText("DG.Inspector.graphTransparency")).toBeInTheDocument()
    expect(screen.getByTestId("background-transparency-checkbox")).toBeInTheDocument()
  })

  it("renders color swatch with correct color", () => {
    render(<PlotBackgroundControls {...defaultProps} />)

    const swatch = screen.getByTestId("color-swatch-DG.Inspector.backgroundColor")
    expect(swatch).toBeInTheDocument()
  })

  it("uses white as default background color when none provided", () => {
    render(<PlotBackgroundControls {...defaultProps} plotBackgroundColor={undefined} />)

    const swatch = screen.getByTestId("color-swatch-DG.Inspector.backgroundColor")
    expect(swatch).toHaveStyle({ backgroundColor: "#FFFFFF" })
  })

  it("toggles transparency checkbox", async () => {
    const user = userEvent.setup()
    render(<PlotBackgroundControls {...defaultProps} />)

    await user.click(screen.getByTestId("background-transparency-checkbox"))
    expect(defaultProps.onBackgroundTransparencyChange).toHaveBeenCalledWith(true)
  })

  it("shows checkbox as selected when isTransparent is true", () => {
    render(<PlotBackgroundControls {...defaultProps} isTransparent={true} />)

    const checkbox = screen.getByTestId("background-transparency-checkbox")
    expect(checkbox).toHaveAttribute("data-selected", "true")
  })

  it("adds disabled class to color picker row when transparent", () => {
    render(<PlotBackgroundControls {...defaultProps} isTransparent={true} />)

    // The color swatch's parent row gets the disabled class
    const swatch = screen.getByTestId("color-swatch-DG.Inspector.backgroundColor")
    // eslint-disable-next-line testing-library/no-node-access
    expect(swatch.closest(".color-picker-row")).toHaveClass("disabled")
  })

  it("does not add disabled class when not transparent", () => {
    render(<PlotBackgroundControls {...defaultProps} isTransparent={false} />)

    const swatch = screen.getByTestId("color-swatch-DG.Inspector.backgroundColor")
    // eslint-disable-next-line testing-library/no-node-access
    expect(swatch.closest(".color-picker-row")).not.toHaveClass("disabled")
  })
})
