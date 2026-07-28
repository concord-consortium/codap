import { ComponentProps } from "react"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { EditFormulaModal } from "./edit-formula-modal"

jest.mock("./formula-editor", () => ({
  FormulaEditor: ({ isAutoCompleteMenuOpen }: any) => {
    // Capture the ref so a test can assert on it after closeModal runs.
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

type ModalProps = ComponentProps<typeof EditFormulaModal>

const baseProps: Omit<ModalProps, "applyFormula"> = {
  modalTitle: "Edit Formula",
  titleLabel: "Attribute name",
  onClose: () => {},
  value: "",
  titleInput: "A",
  isOpen: true
}

function setup(overrides: Partial<ModalProps> = {}) {
  const user = userEvent.setup()
  const props: ModalProps = { ...baseProps, applyFormula: jest.fn(), ...overrides }
  const view = render(<EditFormulaModal {...props} />)
  return { user, applyFormula: props.applyFormula as jest.Mock, props, ...view }
}

describe("EditFormulaModal", () => {
  it("does not carry over the previous attribute's name when reopened for a different attribute", async () => {
    const { user, applyFormula, props, rerender } = setup()

    // Edit attribute A's name to "newA"
    const input = await screen.findByDisplayValue("A")
    await user.clear(input)
    await user.type(input, "newA")

    // Apply: should pass the edited name through
    await user.click(screen.getByRole("button", { name: "Apply" }))
    expect(applyFormula).toHaveBeenLastCalledWith("", "newA")

    // Simulate the parent closing the modal then reopening it for attribute B
    rerender(<EditFormulaModal {...props} isOpen={false} />)
    rerender(<EditFormulaModal {...props} titleInput="B" />)

    // Apply without touching the attribute name input
    await user.click(await screen.findByRole("button", { name: "Apply" }))

    // The current attribute is B, so applyFormula must receive B's name —
    // not the "newA" left over from the previous session.
    expect(applyFormula).toHaveBeenLastCalledWith("", "B")
  })

  it("discards in-session title edits when the modal is canceled and reopened for the same attribute", async () => {
    const { user, applyFormula, props, rerender } = setup()

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
    const { user } = setup()

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
    setup({ titleInput: "" })
    expect(screen.getByTestId("attr-name-input")).not.toBeDisabled()
  })

  it("omits the title row entirely when no titleInput prop is provided (e.g. filter formula)", () => {
    setup({ titleInput: undefined, titleLabel: "Filter formula" })
    expect(screen.queryByTestId("attr-name-input")).not.toBeInTheDocument()
  })

  it("adds the title row when titleInput arrives after the first render", () => {
    // Callers derive titleInput from a model that may still be resolving, so the first render
    // can legitimately have no title. Anything derived from its presence — including the modal's
    // default height — has to follow when it shows up.
    const { props, rerender } = setup({ titleInput: undefined })
    expect(screen.queryByTestId("attr-name-input")).not.toBeInTheDocument()

    rerender(<EditFormulaModal {...props} applyFormula={jest.fn()} titleInput="Design" />)
    expect(screen.getByTestId("attr-name-input")).toHaveValue("Design")
  })

  it("marks the resize grip so CodapModal does not also drag the modal", () => {
    // CodapModal's drag handler skips pointers inside `.component-resize-handle`. Without the
    // class the modal drags while it resizes, moving the corner at twice the pointer's speed.
    setup()
    expect(screen.getByTestId("formula-editor-resize-corner")).toHaveClass("component-resize-handle")
  })

  it("strips the trailing colon from field labels", () => {
    setup({ titleLabel: "Attribute Name:", formulaPrompt: "Formula:" })
    expect(screen.getByText("Attribute Name")).toBeInTheDocument()
    expect(screen.getByText("Formula")).toBeInTheDocument()
  })

  it("shows the modal title in the header", () => {
    setup({ modalTitle: "Add Filter Formula" })
    expect(screen.getByTestId("formula-modal-header")).toHaveTextContent("Add Filter Formula")
  })

  it("empties the formula when Clear is pressed", async () => {
    const { user, applyFormula } = setup({ value: "Height * 2" })

    await user.click(screen.getByRole("button", { name: "Clear" }))
    await user.click(screen.getByRole("button", { name: "Apply" }))

    expect(applyFormula).toHaveBeenLastCalledWith("", "A")
  })

  it("does not close the modal or apply the formula when Clear is pressed", async () => {
    const onClose = jest.fn()
    const { user, applyFormula } = setup({ value: "Height * 2", onClose })

    await user.click(screen.getByRole("button", { name: "Clear" }))

    expect(onClose).not.toHaveBeenCalled()
    expect(applyFormula).not.toHaveBeenCalled()
  })

  it("leaves the title untouched when Clear is pressed", async () => {
    const { user, applyFormula } = setup({ value: "Height * 2" })

    const input = await screen.findByDisplayValue("A")
    await user.clear(input)
    await user.type(input, "renamed")

    await user.click(screen.getByRole("button", { name: "Clear" }))
    await user.click(screen.getByRole("button", { name: "Apply" }))

    // Clear applies to the formula only; an in-session name edit survives it
    expect(applyFormula).toHaveBeenLastCalledWith("", "renamed")
  })

  it("passes the in-session edited attribute name (trimmed) to applyFormula", async () => {
    const { user, applyFormula } = setup()

    const input = await screen.findByDisplayValue("A")
    await user.clear(input)
    await user.type(input, "  renamed  ")
    await user.click(screen.getByRole("button", { name: "Apply" }))

    expect(applyFormula).toHaveBeenCalledWith("", "renamed")
  })
})
