import React, { ReactNode, useState } from "react"
import { Editable, EditableInput, EditablePreview, Flex, Input } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"

import "./component-title-bar.scss"
import { useDraggable } from "@dnd-kit/core"

interface IProps {
  component?: string
  tileId: string
  title: string
  draggableId: string
  children?: ReactNode
}

export const ComponentTitleBar = ({component, tileId, title, draggableId, children}: IProps) => {
  // const [isEditing, setIsEditing] = useState(false)
  // const [, setTitle] = useState(title|| "Dataset")

  // const handleTitleChange = (newTitle?: string) => {
  //   newTitle && setTitle(newTitle)
  //   setIsEditing(false)
  // }
  // const draggableOptions = {id: draggableId, disabled: isEditing}
  // const {attributes, listeners, setActivatorNodeRef} = useDraggable(draggableOptions)
  return (
    // <Flex className={`component-title-bar ${component}-title-bar`}{...listeners} {...attributes}>
    <Flex className={`component-title-bar ${component}-title-bar`}>
      {children}
      {/* <Editable defaultValue={title} className="title-bar" isPreviewFocusable={true} submitOnBlur={true}
          onEdit={()=>setIsEditing(true)}
          onSubmit={handleTitleChange} onCancel={()=>setIsEditing(false)}
      >
        <EditablePreview className="title-text"/>
        <EditableInput className="title-text-input"/>
      </Editable> */}
    </Flex>
  )
}

// interface IEditableComponentTitleProps {
//   className?: string
//   componentTitle: string
//   setIsEditing: (editing: boolean) => void
//   onEndEdit?: (title?: string) => void
// }

// export const EditableComponentTitle: React.FC<IEditableComponentTitleProps> =
//                 observer(({componentTitle, setIsEditing, onEndEdit}) => {
//   const title = componentTitle
//   // const [isEditing, setIsEditing] = useState(false)
//   const [editingTitle, setEditingTitle] = useState(title)
// console.log("in EditableComponentTitle")
//   const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
//     const { key } = e
//     switch (key) {
//       case "Escape":
//         handleClose(false)
//         break
//       case "Enter":
//       case "Tab":
//         handleClose(true)
//         e.currentTarget.blur()
//         break
//     }
//   }
//   const handleClose = (accept: boolean) => {
//     const trimTitle = editingTitle?.trim()
//     onEndEdit?.(accept && trimTitle ? trimTitle : undefined)
//     setIsEditing(false)
//   }
//   return (
//     <Input className="editable-component-title" value={editingTitle} data-testid="editable-component-title" size="sm"
//       onChange={event => setEditingTitle(event.target.value)} onKeyDown={handleKeyDown}
//       onBlur={()=>handleClose(true)} onFocus={(e) => e.target.select()} />
//   )
// })
