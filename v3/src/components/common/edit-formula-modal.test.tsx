import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { EditFormulaModal } from "./edit-formula-modal"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock("./formula-editor", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FormulaEditor: ({ isAutoCompleteMenuOpen }: any) => {
    // Capture the ref so a test can assert on it after closeModal runs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).__capturedIsAutoCompleteMenuOpen = isAutoCompleteMenuOpen
    return (
      <button
        data-testid="open-autocomplete-stub"
        type="button"
        onClick={() => { isAutoCompleteMenuOpen.current = true }}
      />
    )
  }
}))

describe("EditFormulaModal", () => {
  it("does not carry over the previous attribute's name when reopened for a different attribute", async () => {
    const user = userEvent.setup()
    const applyFormula = jest.fn()
    const noop = () => {}

    const props = {
      applyFormula,
      titleLabel: "Attribute name",
      onClose: noop,
      value: ""
    }

    const { rerender } = render(
      <EditFormulaModal {...props} titleInput="A" isOpen={true} />
    )

    // Edit attribute A's name to "newA"
    const input = await screen.findByDisplayValue("A")
    await user.clear(input)
    await user.type(input, "newA")

    // Apply: should pass the edited name through
    await user.click(screen.getByRole("button", { name: "Apply" }))
    expect(applyFormula).toHaveBeenLastCalledWith("", "newA")

    // Simulate the parent closing the modal then reopening it for attribute B
    rerender(<EditFormulaModal {...props} titleInput="A" isOpen={false} />)
    rerender(<EditFormulaModal {...props} titleInput="B" isOpen={true} />)

    // Apply without touching the attribute name input
    const applyButton = await screen.findByRole("button", { name: "Apply" })
    await user.click(applyButton)

    // The current attribute is B, so applyFormula must receive B's name —
    // not the "newA" left over from the previous session.
    expect(applyFormula).toHaveBeenLastCalledWith("", "B")
  })

  it("discards in-session title edits when the modal is canceled and reopened for the same attribute", async () => {
    const user = userEvent.setup()
    const applyFormula = jest.fn()
    const props = {
      applyFormula,
      titleLabel: "Attribute name",
      onClose: () => {},
      value: "",
      titleInput: "A"
    }

    const { rerender } = render(<EditFormulaModal {...props} isOpen={true} />)

    const input = await screen.findByDisplayValue("A")
    await user.clear(input)
    await user.type(input, "newA")

    // Cancel discards in-session edits
    await user.click(screen.getByRole("button", { name: "Cancel" }))

    // Parent closes then reopens for the same attribute (titleInput unchanged)
    rerender(<EditFormulaModal {...props} isOpen={false} />)
    rerender(<EditFormulaModal {...props} isOpen={true} />)

    // Apply without touching the title input — cancel should have discarded "newA"
    await user.click(screen.getByRole("button", { name: "Apply" }))
    expect(applyFormula).toHaveBeenLastCalledWith("", "A")
  })

  it("clears the autocomplete-open state when the modal is closed", async () => {
    const user = userEvent.setup()
    render(
      <EditFormulaModal
        applyFormula={jest.fn()}
        titleLabel="Attribute name"
        onClose={() => {}}
        value=""
        titleInput="A"
        isOpen={true}
      />
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const autocompleteRef = (globalThis as any).__capturedIsAutoCompleteMenuOpen
    expect(autocompleteRef).toBeDefined()

    // Simulate the FormulaEditor opening its autocomplete tooltip
    await user.click(screen.getByTestId("open-autocomplete-stub"))
    expect(autocompleteRef.current).toBe(true)

    // Closing the modal should clear the autocomplete-open ref so a stale `true`
    // doesn't suppress the Escape handler on the next open.
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(autocompleteRef.current).toBe(false)
  })

  it("enables the title input when titleInput is an empty string", () => {
    // Attribute names can be trimmed to "" by Attribute.setName(). When that happens,
    // the formula editor must still allow editing the name to fix it.
    render(
      <EditFormulaModal
        applyFormula={jest.fn()}
        titleLabel="Attribute name"
        onClose={() => {}}
        value=""
        titleInput=""
        isOpen={true}
      />
    )
    expect(screen.getByTestId("attr-name-input")).not.toBeDisabled()
  })

  it("disables the title input when no titleInput prop is provided (e.g. filter formula)", () => {
    render(
      <EditFormulaModal
        applyFormula={jest.fn()}
        titleLabel="Filter formula"
        onClose={() => {}}
        value=""
        isOpen={true}
      />
    )
    expect(screen.getByTestId("attr-name-input")).toBeDisabled()
  })

  it("passes the in-session edited attribute name (trimmed) to applyFormula", async () => {
    const user = userEvent.setup()
    const applyFormula = jest.fn()

    render(
      <EditFormulaModal
        applyFormula={applyFormula}
        titleLabel="Attribute name"
        onClose={() => {}}
        value=""
        titleInput="A"
        isOpen={true}
      />
    )

    const input = await screen.findByDisplayValue("A")
    await user.clear(input)
    await user.type(input, "  renamed  ")
    await user.click(screen.getByRole("button", { name: "Apply" }))

    expect(applyFormula).toHaveBeenCalledWith("", "renamed")
  })
})
