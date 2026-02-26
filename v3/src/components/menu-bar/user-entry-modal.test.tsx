/* eslint-disable testing-library/no-node-access */
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { UserEntryModal } from "./user-entry-modal"

// mock the CFM context so the component renders without a real CloudFileManager
jest.mock("../../hooks/use-cfm-context", () => ({
  useCfmContext: () => ({ client: { openFileDialog: jest.fn() } })
}))

describe("UserEntryModal", () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it("renders nothing when closed", () => {
    render(<UserEntryModal isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders a dialog with proper ARIA attributes when open", () => {
    render(<UserEntryModal isOpen={true} onClose={mockOnClose} />)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()

    // Chakra's ModalHeader should wire up aria-labelledby automatically
    const labelledBy = dialog.getAttribute("aria-labelledby")
    expect(labelledBy).toBeTruthy()
    const header = document.getElementById(labelledBy!)
    expect(header).toBeInTheDocument()
    expect(header?.textContent).toMatch(/what would you like to do/i)

    // Chakra's ModalBody should wire up aria-describedby automatically
    const describedBy = dialog.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)).toBeInTheDocument()
  })

  it("renders both action buttons", () => {
    render(<UserEntryModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText("Open Document or Browse Examples")).toBeInTheDocument()
    expect(screen.getByText("Create New Document")).toBeInTheDocument()
  })

  it("sets initial focus on the default (Open Document) button", () => {
    render(<UserEntryModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText("Open Document or Browse Examples")).toHaveFocus()
  })

  it("traps focus within the modal", async () => {
    const user = userEvent.setup()
    render(<UserEntryModal isOpen={true} onClose={mockOnClose} />)
    const openButton = screen.getByText("Open Document or Browse Examples")
    const newButton = screen.getByText("Create New Document")

    // initial focus is on the Open Document button
    expect(openButton).toHaveFocus()

    // Tab to the New Document button
    await user.tab()
    expect(newButton).toHaveFocus()

    // Tab should wrap back within the modal, not escape to elements outside
    await user.tab()
    const dialog = screen.getByRole("dialog")
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it("calls onClose when the New Document button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserEntryModal isOpen={true} onClose={mockOnClose} />)
    await user.click(screen.getByText("Create New Document"))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("does not close when clicking outside the modal", async () => {
    const user = userEvent.setup()
    render(<UserEntryModal isOpen={true} onClose={mockOnClose} />)
    const overlay = document.querySelector(".chakra-modal__overlay")
    expect(overlay).toBeInTheDocument()
    await user.click(overlay!)
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup()
    render(<UserEntryModal isOpen={true} onClose={mockOnClose} />)
    await user.keyboard("{Escape}")
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
/* eslint-enable testing-library/no-node-access */
