import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ColorPickerPalette } from "./color-picker-palette"

// Mock the ColorPicker (react-colorful wrapper) to avoid rendering the full picker
jest.mock("./color-picker", () => ({
  ColorPicker: ({ color, onChange }: { color: string, onChange: (c: string) => void }) => (
    <input data-testid="color-picker-input" value={color}
      onChange={e => onChange(e.target.value)} />
  )
}))

describe("ColorPickerPalette", () => {
  const defaultProps = {
    swatchBackgroundColor: "#ad2323",
    inputValue: "#ad2323",
    onColorChange: jest.fn(),
    onAccept: jest.fn(),
    onReject: jest.fn(),
    onUpdateValue: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders a RadioGroup with 16 color swatches", () => {
    render(<ColorPickerPalette {...defaultProps} />)

    const radioGroup = screen.getByRole("radiogroup", { name: /color swatches/i })
    expect(radioGroup).toBeInTheDocument()

    const radios = within(radioGroup).getAllByRole("radio")
    expect(radios).toHaveLength(16)
  })

  it("marks the matching swatch as selected", () => {
    render(<ColorPickerPalette {...defaultProps} swatchBackgroundColor="#ad2323" />)

    const selectedRadio = screen.getByRole("radio", { name: "#ad2323" })
    expect(selectedRadio).toBeChecked()
  })

  it("calls onColorChange when a swatch is clicked", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    const blackSwatch = screen.getByRole("radio", { name: "#000000" })
    await user.click(blackSwatch)

    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#000000")
  })

  it("supports arrow key navigation between swatches", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} swatchBackgroundColor="#000000" />)

    const firstSwatch = screen.getByRole("radio", { name: "#000000" })
    firstSwatch.focus()

    await user.keyboard("{ArrowRight}")
    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#a9a9a9")
  })

  it("renders a 17th swatch for non-standard colors", () => {
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#123456" inputValue="#123456" />)

    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(17)

    const customSwatch = screen.getByRole("radio", { name: "#123456" })
    expect(customSwatch).toBeInTheDocument()
  })

  it("does not render a 17th swatch when color matches a palette color", () => {
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#000000" inputValue="#000000" />)

    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(16)
  })

  it("does not render a 17th swatch when inputValue is empty", () => {
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#123456" inputValue="" />)

    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(16)
  })

  it("shows 'more' button that expands the color picker", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    const moreButton = screen.getByTestId("toggle-show-color-picker-button")
    expect(moreButton).toHaveTextContent("more")

    await user.click(moreButton)

    expect(moreButton).toHaveTextContent("less")
    expect(screen.getByTestId("color-picker-input")).toBeInTheDocument()
  })

  it("hides the color picker when 'less' is clicked", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    const toggleButton = screen.getByTestId("toggle-show-color-picker-button")
    await user.click(toggleButton) // expand
    await user.click(toggleButton) // collapse

    expect(toggleButton).toHaveTextContent("more")
    expect(screen.queryByTestId("color-picker-input")).not.toBeInTheDocument()
  })

  it("shows Cancel and Set Color buttons when color picker is expanded", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    // Not visible initially
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument()
    expect(screen.queryByText("Set Color")).not.toBeInTheDocument()

    // Expand
    await user.click(screen.getByTestId("toggle-show-color-picker-button"))

    expect(screen.getByText("Cancel")).toBeInTheDocument()
    expect(screen.getByText("Set Color")).toBeInTheDocument()
  })

  it("calls onAccept with the selected color when Set Color is clicked", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    // Select a different color
    await user.click(screen.getByRole("radio", { name: "#000000" }))

    // Expand and accept
    await user.click(screen.getByTestId("toggle-show-color-picker-button"))
    await user.click(screen.getByText("Set Color"))

    expect(defaultProps.onAccept).toHaveBeenCalledWith("#000000")
  })

  it("calls onReject when Cancel is clicked", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    await user.click(screen.getByTestId("toggle-show-color-picker-button"))
    await user.click(screen.getByText("Cancel"))

    expect(defaultProps.onReject).toHaveBeenCalled()
  })

  it("collapses the color picker on accept", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    await user.click(screen.getByTestId("toggle-show-color-picker-button"))
    expect(screen.getByTestId("color-picker-input")).toBeInTheDocument()

    await user.click(screen.getByText("Set Color"))
    expect(screen.queryByTestId("color-picker-input")).not.toBeInTheDocument()
  })

  it("collapses the color picker on reject", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    await user.click(screen.getByTestId("toggle-show-color-picker-button"))
    expect(screen.getByTestId("color-picker-input")).toBeInTheDocument()

    await user.click(screen.getByText("Cancel"))
    expect(screen.queryByTestId("color-picker-input")).not.toBeInTheDocument()
  })

  it("applies 'light' class to light-colored swatches", () => {
    render(<ColorPickerPalette {...defaultProps} />)

    // React Aria Radio renders the className on the <label> wrapper, not the <input role="radio">
    // eslint-disable-next-line testing-library/no-node-access
    const whiteSwatch = screen.getByRole("radio", { name: "#FFFFFF" }).closest("label")
    expect(whiteSwatch).toHaveClass("light")

    // eslint-disable-next-line testing-library/no-node-access
    const blackSwatch = screen.getByRole("radio", { name: "#000000" }).closest("label")
    expect(blackSwatch).not.toHaveClass("light")
  })
})
