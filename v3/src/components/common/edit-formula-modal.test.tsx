import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { EditFormulaModal } from "./edit-formula-modal"

jest.mock("./formula-editor", () => ({
  FormulaEditor: () => <div data-testid="formula-editor-stub" />
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
