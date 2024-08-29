import React, { useState } from "react"

import "./case-cell-editor.scss"

function autoFocusAndSelect(input: HTMLInputElement | null) {
  input?.focus()
  input?.select()
}

interface ICaseCellTextEditorProps {
  value: string
  onBlur: (newValue: string) => void
}

export default function CaseCellTextEditor({value, onBlur}: ICaseCellTextEditorProps) {
  const [newValue, setNewValue] = useState(value)

  const handleChange = (input: string) => {
    setNewValue(input)
  }

  return (
    <input
      className="case-cell-text-editor"
      data-testid="case-card-cell-text-editor"
      ref={autoFocusAndSelect}
      value={newValue}
      onBlur={(event) => onBlur(event.target.value)}
      onChange={(event) => handleChange(event.target.value)}
    />
  )
}
