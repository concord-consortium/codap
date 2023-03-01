import React, { ReactNode, useState } from "react"
import { Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import { useDraggable } from "@dnd-kit/core"


import "./component-title-bar.scss"

interface IProps {
  component?: string
  tileId: string
  title: string
  draggableId: string
  children?: ReactNode
}

export const ComponentTitleBar = ({component, tileId, title, draggableId, children}: IProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [, setTitle] = useState(title|| "Dataset")

  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
    setIsEditing(false)
  }
  const draggableOptions = {id: draggableId, disabled: isEditing}
  const {attributes, listeners, setActivatorNodeRef} = useDraggable(draggableOptions)
  return (
    <Flex className={`component-title-bar ${component}-title-bar`}
        ref={setActivatorNodeRef} {...listeners} {...attributes}>
      {children}
      <Editable defaultValue={title} className="title-bar" isPreviewFocusable={true} submitOnBlur={true}
          onEdit={()=>setIsEditing(true)} onSubmit={handleTitleChange} onCancel={()=>setIsEditing(false)}>
        <EditablePreview className="title-text"/>
        <EditableInput className="title-text-input"/>
      </Editable>
    </Flex>
  )
}
