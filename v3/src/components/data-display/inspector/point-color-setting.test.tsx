import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PointColorSetting } from "./point-color-setting"

// Mock useOutsidePointerDown to be a no-op
jest.mock("../../../hooks/use-outside-pointer-down", () => ({
  useOutsidePointerDown: jest.fn()
}))

// Mock Chakra Portal to render children directly
jest.mock("@chakra-ui/react", () => ({
  Popover: ({ children, isOpen }: any) => (
    <div data-testid="popover" data-open={isOpen}>{children}</div>
  ),
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  Portal: ({ children }: any) => <div data-testid="portal">{children}</div>
}))

// Mock ColorPickerPalette
jest.mock("../../common/color-picker-palette", () => ({
  ColorPickerPalette: ({ onUpdateValue, onAccept, onReject }: any) => (
    <div data-testid="color-picker-palette">
      <button data-testid="update-color" onClick={() => onUpdateValue("#AABBCC")}>Update</button>
      <button data-testid="accept-color" onClick={() => onAccept("#AABBCC")}>Accept</button>
      <button data-testid="reject-color" onClick={() => onReject()}>Reject</button>
    </div>
  )
}))

describe("PointColorSetting", () => {
  const defaultProps = {
    onColorChange: jest.fn(),
    propertyLabel: "Fill Color",
    swatchBackgroundColor: "#FF0000"
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders a swatch button with accessible name and ARIA attributes", () => {
    render(<PointColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    expect(button).toHaveClass("color-picker-thumb")
    expect(button).toHaveAttribute("aria-label", "Fill Color: #FF0000")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).toHaveAttribute("aria-haspopup", "dialog")
  })

  it("renders swatch inside the button", () => {
    render(<PointColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    // eslint-disable-next-line testing-library/no-node-access
    expect(button.firstElementChild).toHaveClass("color-picker-thumb-swatch")
  })

  it("opens popover when swatch is clicked", async () => {
    const user = userEvent.setup()
    render(<PointColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)

    const popover = screen.getByTestId("popover")
    expect(popover).toHaveAttribute("data-open", "true")
  })

  it("closes popover when swatch is clicked again", async () => {
    const user = userEvent.setup()
    render(<PointColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)
    await user.click(button)

    const popover = screen.getByTestId("popover")
    expect(popover).toHaveAttribute("data-open", "false")
  })

  it("renders ColorPickerPalette inside portal", () => {
    render(<PointColorSetting {...defaultProps} />)

    expect(screen.getByTestId("color-picker-palette")).toBeInTheDocument()
  })

  it("calls onColorChange when color is updated", async () => {
    const user = userEvent.setup()
    render(<PointColorSetting {...defaultProps} />)

    await user.click(screen.getByTestId("update-color"))
    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#AABBCC")
  })

  it("calls onColorChange with initial color when rejected", async () => {
    const user = userEvent.setup()
    render(<PointColorSetting {...defaultProps} />)

    // Open the popover first to set initialColorRef
    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)

    await user.click(screen.getByTestId("reject-color"))
    expect(defaultProps.onColorChange).toHaveBeenCalledWith("#FF0000")
  })

  it("closes popover when closeTrigger changes while open", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PointColorSetting {...defaultProps} closeTrigger={0} />)

    // Open the popover
    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)
    expect(screen.getByTestId("popover")).toHaveAttribute("data-open", "true")

    // Change closeTrigger — popover should close
    rerender(<PointColorSetting {...defaultProps} closeTrigger={1} />)
    expect(screen.getByTestId("popover")).toHaveAttribute("data-open", "false")
  })

  it("does not close popover when closeTrigger changes while already closed", () => {
    const { rerender } = render(<PointColorSetting {...defaultProps} closeTrigger={0} />)
    expect(screen.getByTestId("popover")).toHaveAttribute("data-open", "false")

    rerender(<PointColorSetting {...defaultProps} closeTrigger={1} />)
    expect(screen.getByTestId("popover")).toHaveAttribute("data-open", "false")
  })

  it("adds open class to button when popover is open", async () => {
    const user = userEvent.setup()
    render(<PointColorSetting {...defaultProps} />)

    const button = screen.getByRole("button", { name: /Fill Color/ })
    await user.click(button)

    expect(button).toHaveClass("open")
  })
})
