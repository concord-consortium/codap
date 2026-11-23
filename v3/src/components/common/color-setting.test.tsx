import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ColorSetting } from "./color-setting"

// Mock ColorPickerPalette
jest.mock("./color-picker-palette", () => ({
  ColorPickerPalette: ({ onUpdateValue, onAccept, onReject }: any) => (
    <div data-testid="color-picker-palette" onKeyDownCapture={(e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onReject()
      }
    }}>
      <button data-testid="update-color" onClick={() => onUpdateValue("#AABBCC")}>Update</button>
      <button data-testid="accept-color" onClick={() => onAccept("#AABBCC")}>Accept</button>
    </div>
  )
}))

describe("ColorSetting", () => {
  const defaultProps = {
    onColorChange: jest.fn(),
    propertyLabel: "Fill Color",
    swatchBackgroundColor: "#FF0000",
    testIdSuffix: "fill"
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders a swatch button with accessible name and ARIA attributes", () => {
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    expect(button).toHaveClass("color-picker-thumb")
    expect(button).toHaveAttribute("aria-label", "Fill Color: #FF0000")
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("renders swatch inside the button", () => {
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    // eslint-disable-next-line testing-library/no-node-access
    expect(button.firstElementChild).toHaveClass("color-picker-thumb-swatch")
  })

  it("opens popover when swatch is clicked", async () => {
    const user = userEvent.setup()
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)

    expect(screen.getByTestId("color-picker-palette")).toBeInTheDocument()
    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("closes popover when swatch is clicked again", async () => {
    const user = userEvent.setup()
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")

    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("calls onColorChange when color is updated", async () => {
    const user = userEvent.setup()
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)

    await user.click(screen.getByTestId("update-color"))
    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#AABBCC")
  })

  it("closes popover when closeTrigger changes while open", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ColorSetting {...defaultProps} closeTrigger={0} />)

    // Open the popover
    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")

    // Change closeTrigger — popover should close
    rerender(<ColorSetting {...defaultProps} closeTrigger={1} />)
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("adds open class to button when popover is open", async () => {
    const user = userEvent.setup()
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)

    expect(button).toHaveClass("open")
  })

  it("closes and reverts color when Escape is pressed", async () => {
    const user = userEvent.setup()
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")

    // Change the color, then press Escape to revert
    await user.click(screen.getByTestId("update-color"))
    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#AABBCC")
    defaultProps.onColorChange.mockClear()

    await user.keyboard("{Escape}")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#FF0000")
  })

  it("accepts color without rejecting", async () => {
    const user = userEvent.setup()
    render(<ColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)

    await user.click(screen.getByTestId("accept-color"))
    // Should have called onColorChange with the accepted color, not the initial
    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#AABBCC")
    // Should NOT have been called with the initial color (reject)
    expect(defaultProps.onColorChange).not.toHaveBeenCalledWith("#FF0000")
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()
    render(<ColorSetting {...defaultProps} disabled={true} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("gives the swatch button a testid from testIdSuffix", () => {
    render(<ColorSetting {...defaultProps} testIdSuffix="stroke" />)
    expect(screen.getByTestId("color-swatch-button-stroke")).toBeInTheDocument()
  })
})
