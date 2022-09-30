import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { Input } from "@chakra-ui/react"

import "./editable-component-title.scss"

interface IProps {
  className?: string
  componentTitle: string
  onEndEdit?: (title?: string) => void
}
export const EditableComponentTitle: React.FC<IProps> = observer(({componentTitle, onEndEdit}) => {
  const title = componentTitle || "New Dataset"
  const [isEditing, setIsEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(title)

  const handleClick = () => {
    if (!isEditing) {
      setEditingTitle(title)
      setIsEditing(true)
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = e
    switch (key) {
      case "Escape":
        handleClose(false)
        break
      case "Enter":
      case "Tab":
        handleClose(true)
        e.currentTarget.blur()
        break
    }
  }
  const handleClose = (accept: boolean) => {
    const trimTitle = editingTitle?.trim()
    onEndEdit?.(accept && trimTitle ? trimTitle : undefined)
    setIsEditing(false)
  }
  return (
    <Input className="editable-component-title" value={editingTitle} data-testid="editable-component-title" size="sm"
      onClick={handleClick} onChange={event => setEditingTitle(event.target.value)} onKeyDown={handleKeyDown}
      onBlur={()=>handleClose(true)} onFocus={(e) => e.target.select()} />
  )
})
