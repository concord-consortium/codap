import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from '@testing-library/user-event'
import React from "react"
import { DGTextInput } from "./text-input.v2"

describe("Case card TextInput", () => {
  it("works as expected", async () => {
    const user = userEvent.setup()
    const mockOnEditModeCallback = jest.fn()
    const mockOnEscapeEditing = jest.fn()
    const mockOnToggleEditing = jest.fn()

    // renders the value by default
    const { container, rerender } = render(
      <DGTextInput value="foo" isEditable={true} onEditModeCallback={mockOnEditModeCallback}
                onEscapeEditing={mockOnEscapeEditing} onToggleEditing={mockOnToggleEditing}/>
    )
    const valueSpan = screen.getByText("foo")
    expect(valueSpan).toBeInTheDocument()

    // clicking calls onToggleEditing
    await user.click(valueSpan)
    expect(mockOnToggleEditing).toHaveBeenCalledTimes(1)

    // createInEditMode controls editing
    rerender(
      <DGTextInput value="foo" isEditable={true}
                createInEditMode={true} onEditModeCallback={mockOnEditModeCallback}
                onEscapeEditing={mockOnEscapeEditing} onToggleEditing={mockOnToggleEditing}/>
    )
    const inputElt = screen.getByDisplayValue("foo")
    expect(inputElt).toBeInTheDocument()
    expect(inputElt).toHaveFocus()
    expect(mockOnEditModeCallback).toHaveBeenCalledTimes(1)

    // can type into text field
    await user.keyboard("bar")
    const editedElt = screen.getByDisplayValue("bar")
    expect(editedElt).toBeInTheDocument()

    // enter key calls onToggleEditing (but doesn't stop editing on its own)
    fireEvent.keyDown(inputElt, { keyCode: 13 })
    expect(mockOnToggleEditing).toHaveBeenCalledTimes(2)

    // esc key calls onEscapeEditing (but doesn't stop editing on its own)
    fireEvent.keyDown(inputElt, { keyCode: 27 })
    expect(mockOnEscapeEditing).toHaveBeenCalledTimes(1)
    expect(mockOnToggleEditing).toHaveBeenCalledTimes(2)

    // click outside input element calls onToggleEditing
    fireEvent.mouseDown(container)
    expect(mockOnToggleEditing).toHaveBeenCalledTimes(3)
  })
})
