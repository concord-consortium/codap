import { render, screen } from "@testing-library/react"
import { CodapModal } from "./codap-modal"

describe("CodapModal", () => {
  it("is draggable at a fixed position by default", () => {
    render(<CodapModal isOpen={true} onClose={jest.fn()}><div>content</div></CodapModal>)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveClass("codap-modal-content")
    expect(dialog).toHaveStyle({ position: "absolute", left: "350px", top: "250px", cursor: "move" })
  })

  it("omits drag behavior and fixed positioning when isDraggable is false", () => {
    render(
      <CodapModal isOpen={true} onClose={jest.fn()} isCentered={true} isDraggable={false} modalWidth="520px">
        <div>content</div>
      </CodapModal>
    )
    const dialog = screen.getByRole("dialog")
    expect(dialog).not.toHaveClass("codap-modal-content")
    expect(dialog.style.left).toBe("")
    expect(dialog.style.top).toBe("")
    expect(dialog.style.cursor).toBe("")
  })
})
