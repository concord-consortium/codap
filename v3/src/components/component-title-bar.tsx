import React, { ReactNode, useState } from "react"
import { Flex, Input } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"

import "./component-title-bar.scss"

interface IProps {
  component?: string
  children?: ReactNode
}

export const ComponentTitleBar = ({component, children}: IProps) => {
  return (
    <Flex className={`component-title-bar ${component}-title-bar`}>
      {children}
    </Flex>
  )
}

interface IEditableComponentTitleProps {
  className?: string
  componentTitle: string
  setIsEditing: (editing: boolean) => void
  onEndEdit?: (title?: string) => void
}

export const EditableComponentTitle: React.FC<IEditableComponentTitleProps> =
                observer(({componentTitle, onEndEdit, setIsEditing}) => {
  const title = componentTitle
  const [editingTitle, setEditingTitle] = useState(title)
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
      onChange={event => setEditingTitle(event.target.value)} onKeyDown={handleKeyDown}
      onBlur={()=>handleClose(true)} onFocus={(e) => e.target.select()} />
  )
})
