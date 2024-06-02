import { Button, CloseButton, Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { IUseDraggableTile, useDraggableTile } from "../hooks/use-drag-drop"
import { uiState } from "../models/ui-state"
import MinimizeIcon from "../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "./tiles/tile-base-props"
import { t } from "../utilities/translation/translate"

import "./component-title-bar.scss"

export const ComponentTitleBar = observer(function ComponentTitleBar(
    { tile, getTitle, children, onHandleTitleChange, onMinimizeTile, onCloseTile }: ITileTitleBarProps) {
  // perform all title-related model access here so only title is re-rendered when properties change
  const title = getTitle?.() || tile?.title || t("DG.AppController.createDataSet.name")
  const [isEditing, setIsEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(title)
  const { active } = useDndContext()
  const dragging = !!active
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  const draggableOptions: IUseDraggableTile = { prefix: tileType || "tile", tileId, disabled: isEditing }
  const {attributes, listeners, setActivatorNodeRef} = useDraggableTile(draggableOptions)
  const classes = clsx("component-title-bar", `${tileType}-title-bar`, {focusTile: uiState.isFocusedTile(tile?.id)})

  const handleChangeTitle = (nextValue?: string) => {
    if (tile != null && nextValue) {
      tile.applyModelChange(() => {
        tile.setTitle(nextValue)
      }, {
        undoStringKey: "DG.Undo.component.componentTitleChange",
        redoStringKey: "DG.Redo.component.componentTitleChange"
      })
    }
  }

  const handleChange = (nextValue: string) => {
    setEditingTitle(nextValue)
  }

  const handleSubmit = (nextValue: string) => {
    if (onHandleTitleChange) {
      onHandleTitleChange(nextValue)
    } else {
      handleChangeTitle(nextValue)
    }
    // Assume the title was successfully changed if nextValue is not empty.
    setEditingTitle(nextValue || title)
    setIsEditing(false)
  }

  const handleCancel = (previousValue: string) => {
    setEditingTitle(previousValue)
    setIsEditing(false)
  }

  return (
    <Flex className={classes}
        ref={setActivatorNodeRef} {...listeners} {...attributes}>
      {children}
      <Editable value={isEditing ? editingTitle : title} className="title-bar" isPreviewFocusable={!dragging}
        submitOnBlur={true} onEdit={() => setIsEditing(true)} onSubmit={handleSubmit}
        onChange={handleChange} onCancel={handleCancel} data-testid="editable-component-title"
      >
        <EditablePreview className="title-text"/>
        <EditableInput value={editingTitle} className="title-text-input" data-testid="title-text-input"/>
      </Editable>
      <Flex className={clsx("header-right", { disabled: isEditing })}>
        <Button className="component-minimize-button" title={t("DG.Component.minimizeComponent.toolTip")}
          data-testid="component-minimize-button">
          <MinimizeIcon className="component-minimize-icon" onPointerDown={onMinimizeTile}/>
        </Button>
        {!tile?.cannotClose &&
          <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
            onPointerDown={()=>onCloseTile?.(tileId)} data-testid="component-close-button"/>
        }
      </Flex>
    </Flex>
  )
})
