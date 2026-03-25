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

  it("renders a ListBox with 16 color swatches", () => {
    render(<ColorPickerPalette {...defaultProps} />)

    const listbox = screen.getByRole("listbox", { name: /color swatches/i })
    expect(listbox).toBeInTheDocument()

    const options = within(listbox).getAllByRole("option")
    expect(options).toHaveLength(16)
  })

  it("marks the matching swatch as selected", () => {
    render(<ColorPickerPalette {...defaultProps} swatchBackgroundColor="#ad2323" />)

    const selectedOption = screen.getByRole("option", { name: "Red", selected: true })
    expect(selectedOption).toBeInTheDocument()
  })

  it("calls onColorChange when a swatch is clicked", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    const blackSwatch = screen.getByRole("option", { name: "Black" })
    await user.click(blackSwatch)

    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#000000")
  })

  it("supports arrow key navigation between swatches without changing selection", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} swatchBackgroundColor="#000000" />)

    const firstSwatch = screen.getByRole("option", { name: "Black" })
    firstSwatch.focus()

    await user.keyboard("{ArrowRight}")
    // ListBox separates focus from selection — arrow keys move focus but don't select
    expect(defaultProps.onColorChange).not.toHaveBeenCalled()
  })

  it("selects a different swatch on click", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} swatchBackgroundColor="#000000" />)

    // Click a different swatch to select it
    const graySwatch = screen.getByRole("option", { name: "Dark gray" })
    await user.click(graySwatch)

    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#a9a9a9")
  })

  it("renders a 17th swatch for non-standard colors", () => {
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#123456" inputValue="#123456" />)

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(17)

    // Non-standard colors still use the hex code as the aria-label
    const customSwatch = screen.getByRole("option", { name: "#123456" })
    expect(customSwatch).toBeInTheDocument()
  })

  it("preserves the non-standard swatch during keyboard navigation", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#123456" inputValue="#123456" />)

    // 17th swatch should be present
    expect(screen.getAllByRole("option")).toHaveLength(17)

    // Navigate away from the custom swatch with arrow keys
    const customSwatch = screen.getByRole("option", { name: "#123456" })
    customSwatch.focus()
    await user.keyboard("{ArrowLeft}")

    // The custom swatch should still be in the DOM
    expect(screen.getAllByRole("option")).toHaveLength(17)
    expect(screen.getByRole("option", { name: "#123456" })).toBeInTheDocument()
  })

  it("does not render a 17th swatch when color matches a palette color", () => {
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#000000" inputValue="#000000" />)

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(16)
  })

  it("doesn't render 17th swatch when swatchBackgroundColor is non-standard but inputValue is a palette color", () => {
    // Regression: the text tile passes swatchBackgroundColor="white" with inputValue="#000000".
    // Without the guard, this would create a duplicate ListBoxItem with id="#000000".
    render(<ColorPickerPalette {...defaultProps} swatchBackgroundColor="white" inputValue="#000000" />)

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(16)
  })

  it("handles uppercase hex codes without creating duplicate swatches", () => {
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#AD2323" inputValue="#AD2323" />)

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(16)

    // The matching swatch should be selected despite case difference
    const selectedOption = screen.getByRole("option", { name: "Red", selected: true })
    expect(selectedOption).toBeInTheDocument()
  })

  it("does not render a 17th swatch when inputValue is empty", () => {
    render(<ColorPickerPalette {...defaultProps}
      swatchBackgroundColor="#123456" inputValue="" />)

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(16)
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
    await user.click(screen.getByRole("option", { name: "Black" }))

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

    // ListBoxItem renders className directly on the <div role="option"> element
    const whiteSwatch = screen.getByRole("option", { name: "White" })
    expect(whiteSwatch).toHaveClass("light")

    const blackSwatch = screen.getByRole("option", { name: "Black" })
    expect(blackSwatch).not.toHaveClass("light")
  })

  it("calls onCommitColor when a swatch is selected", async () => {
    const onCommitColor = jest.fn()
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} onCommitColor={onCommitColor} />)

    await user.click(screen.getByRole("option", { name: "Black" }))

    expect(onCommitColor).toHaveBeenCalledWith("#000000")
  })

  it("calls onExpandedChange when More/Less is toggled", async () => {
    const onExpandedChange = jest.fn()
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} onExpandedChange={onExpandedChange} />)

    const toggleButton = screen.getByTestId("toggle-show-color-picker-button")
    await user.click(toggleButton)
    expect(onExpandedChange).toHaveBeenCalledWith(true)

    await user.click(toggleButton)
    expect(onExpandedChange).toHaveBeenCalledWith(false)
  })

  it("calls onReject when Escape is pressed while a swatch is focused", async () => {
    const user = userEvent.setup()
    render(<ColorPickerPalette {...defaultProps} />)

    const swatch = screen.getByRole("option", { name: "Black" })
    swatch.focus()
    await user.keyboard("{Escape}")

    expect(defaultProps.onReject).toHaveBeenCalled()
  })
})
