import { Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import { useDndContext, useDraggable } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { ReactNode, useState } from "react"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import t from "../utilities/translation/translate"

import "./component-title-bar.scss"

interface IProps {
  tile?: ITileModel
  component?: string
  title: string
  draggableId: string
  children?: ReactNode
}

export const ComponentTitleBar = observer(function ComponentTitleBar(
  {tile, component, title, draggableId, children}: IProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [, setTitle] = useState(title || t("DG.AppController.createDataSet.name"))
  const { active } = useDndContext()
  const dragging = !!active

  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
    setIsEditing(false)
  }

  const handleCancel =  () => {
    setIsEditing(false)
  }

  const draggableOptions = {id: draggableId, disabled: isEditing}
  const {attributes, listeners, setActivatorNodeRef} = useDraggable(draggableOptions)
  const classes = clsx("component-title-bar", `${component}-title-bar`, {focusTile: uiState.isFocusedTile(tile?.id)})

  return (
    <Flex className={classes}
        ref={setActivatorNodeRef} {...listeners} {...attributes}>
      {children}
      <Editable defaultValue={title} className="title-bar" isPreviewFocusable={!dragging} submitOnBlur={true}
          onEdit={()=>setIsEditing(true)} onSubmit={handleTitleChange} onCancel={handleCancel}
          data-testid="editable-component-title">
        <EditablePreview className="title-text"/>
        <EditableInput className="title-text-input"/>
      </Editable>
    </Flex>
  )
})
