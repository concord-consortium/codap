import { Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import { useDndContext, useDraggable } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { ReactNode, useState } from "react"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"

import styles from "./component-title-bar.module.scss"

// okay, we've kinda got it figured out at this point. probably not something we can automate, 10% took us 20 minutes?
// Let's say 10 minutes with a learning curve down. So like two more hours of work to do it.

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
  const { active } = useDndContext()
  const dragging = !!active

  const handleChangeTitle = (nextValue?: string) => {
    if (tile != null && nextValue) {
      tile.setTitle(nextValue)
    }
  }

  const draggableOptions = {id: draggableId, disabled: isEditing}
  const {attributes, listeners, setActivatorNodeRef} = useDraggable(draggableOptions)
  const classes = clsx("component-title-bar", `${component}-title-bar`, styles['component-title-bar'], 
    {focusTile: uiState.isFocusedTile(tile?.id)})

  return (
    <Flex className={classes}
        ref={setActivatorNodeRef} {...listeners} {...attributes}>
      {children}
      <Editable value={title} className={`title-bar ${styles['title-bar']}`}
          isPreviewFocusable={!dragging} submitOnBlur={true}
          onEdit={() => setIsEditing(true)} onSubmit={() => setIsEditing(false)}
          onChange={handleChangeTitle} onCancel={() => setIsEditing(false)}
          data-testid="editable-component-title">
        <EditablePreview className={`title-text ${styles['title-text']}`} />
        <EditableInput className={`title-text-input ${styles['title-text-input']}`} />
      </Editable>
    </Flex>
  )
})
