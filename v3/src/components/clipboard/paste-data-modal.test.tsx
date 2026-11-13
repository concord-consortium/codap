import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PasteDataModal } from "./paste-data-modal"

const kTableHtml = "<table><tr><td>1</td></tr></table>"

describe("PasteDataModal", () => {
  function renderModal(permissionDenied = false) {
    const onImport = jest.fn()
    const onCancel = jest.fn()
    render(<PasteDataModal isOpen={true} permissionDenied={permissionDenied}
              onImport={onImport} onCancel={onCancel} />)
    const textArea = screen.getByRole("textbox")
    const importButton = screen.getByTestId("paste-data-import-button")
    return { onImport, onCancel, textArea, importButton }
  }

  function pasteInto(textArea: HTMLElement, html: string, text: string) {
    fireEvent.paste(textArea, {
      clipboardData: { getData: (type: string) => type === "text/html" ? html : type === "text/plain" ? text : "" }
    })
    // jsdom doesn't perform the default paste, so simulate the text area's resulting change
    fireEvent.change(textArea, { target: { value: (textArea as HTMLTextAreaElement).value + text } })
  }

  it("shows the prompt", () => {
    renderModal()
    expect(screen.getByText("Reading from the clipboard failed. Paste your data here:")).toBeInTheDocument()
  })

  it("shows the permission line only when clipboard access is denied", () => {
    const { unmount } = render(<PasteDataModal isOpen={true} permissionDenied={false}
                                  onImport={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.queryByText(/blocking clipboard access/)).not.toBeInTheDocument()
    unmount()
    renderModal(true)
    expect(screen.getByText(
      "Your browser is blocking clipboard access. You may be able to allow it in site settings."
    )).toBeInTheDocument()
  })

  it("doesn't close when the overlay is clicked, so pasted text isn't lost", async () => {
    const user = userEvent.setup()
    const { onCancel } = renderModal()
    // Chakra closes a modal when the area around its content is clicked, and that area has no accessible role
    // eslint-disable-next-line testing-library/no-node-access
    const container = document.querySelector(".chakra-modal__content-container")
    expect(container).toBeInTheDocument()
    await user.click(container as Element)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("returns focus to the given element when it closes", async () => {
    const returnTo = document.createElement("button")
    document.body.appendChild(returnTo)
    const props = { permissionDenied: false, onImport: jest.fn(), onCancel: jest.fn(), returnFocus: returnTo }
    const { rerender } = render(<PasteDataModal isOpen={true} {...props} />)
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveFocus())
    // the request (and with it the return-focus element) is cleared in the same render that closes the dialog
    rerender(<PasteDataModal isOpen={false} {...props} returnFocus={undefined} />)
    await waitFor(() => expect(returnTo).toHaveFocus())
    returnTo.remove()
  })

  it("focuses the text area when it opens", async () => {
    const { textArea } = renderModal()
    await waitFor(() => expect(textArea).toHaveFocus())
  })

  it("disables Import while the text area is empty or whitespace", async () => {
    const { textArea, importButton } = renderModal()
    expect(importButton).toBeDisabled()
    fireEvent.change(textArea, { target: { value: "  \n\t" } })
    expect(importButton).toBeDisabled()
    fireEvent.change(textArea, { target: { value: "a" } })
    expect(importButton).toBeEnabled()
  })

  it("imports typed text as plain text", async () => {
    const user = userEvent.setup()
    const { onImport, textArea, importButton } = renderModal()
    await user.type(textArea, "a,b")
    await user.click(importButton)
    expect(onImport).toHaveBeenCalledWith({ text: "a,b" })
  })

  it("includes the pasted HTML when the text hasn't been edited since the paste", async () => {
    const user = userEvent.setup()
    const { onImport, textArea, importButton } = renderModal()
    pasteInto(textArea, kTableHtml, "1")
    await user.click(importButton)
    expect(onImport).toHaveBeenCalledWith({ text: "1", html: kTableHtml })
  })

  it("drops the pasted HTML once the text has been edited", async () => {
    const user = userEvent.setup()
    const { onImport, textArea, importButton } = renderModal()
    pasteInto(textArea, kTableHtml, "1")
    fireEvent.change(textArea, { target: { value: "1x" } })
    await user.click(importButton)
    expect(onImport).toHaveBeenCalledWith({ text: "1x" })
  })

  it("drops the pasted HTML when pasting into text that's already there", async () => {
    const user = userEvent.setup()
    const { onImport, textArea, importButton } = renderModal()
    pasteInto(textArea, "<table><tr><td>A</td></tr></table>", "A\n")
    pasteInto(textArea, "<table><tr><td>B</td></tr></table>", "B")
    await user.click(importButton)
    expect(onImport).toHaveBeenCalledWith({ text: "A\nB" })
  })

  it("drops the pasted HTML when text was typed before the paste", async () => {
    const user = userEvent.setup()
    const { onImport, textArea, importButton } = renderModal()
    fireEvent.change(textArea, { target: { value: "header\n" } })
    pasteInto(textArea, kTableHtml, "1")
    await user.click(importButton)
    expect(onImport).toHaveBeenCalledWith({ text: "header\n1" })
  })

  it("calls onCancel from the Cancel and close buttons", async () => {
    const user = userEvent.setup()
    const { onCancel } = renderModal()
    await user.click(screen.getByTestId("paste-data-cancel-button"))
    await user.click(screen.getByTestId("modal-close-button"))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
