import { Button, CloseButton, Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import { useDndContext, useDraggable } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { uiState } from "../models/ui-state"
import MinimizeIcon from "../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "./tiles/tile-base-props"
import t from "../utilities/translation/translate"

import "./component-title-bar.scss"

export const ComponentTitleBar = observer(function ComponentTitleBar(
    { tile, getTitle, children, onHandleTitleChange, onMinimizeTile, onCloseTile }: ITileTitleBarProps) {
  // perform all title-related model access here so only title is re-rendered when properties change
  const title = getTitle?.() || tile?.title || t("DG.AppController.createDataSet.name")
  const [isEditing, setIsEditing] = useState(false)
  const { active } = useDndContext()
  const dragging = !!active
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  const draggableId = `${tileType}-${tileId}`
  const draggableOptions = {id: draggableId, disabled: isEditing}
  const {attributes, listeners, setActivatorNodeRef} = useDraggable(draggableOptions)
  const classes = clsx("component-title-bar", `${tileType}-title-bar`, {focusTile: uiState.isFocusedTile(tile?.id)})

  const handleChangeTitle = (nextValue?: string) => {
    if (tile != null && nextValue) {
      tile.setTitle(nextValue)
    }
  }

  return (
    <Flex className={classes}
        ref={setActivatorNodeRef} {...listeners} {...attributes}>
      {children}
      <Editable value={title} className="title-bar" isPreviewFocusable={!dragging} submitOnBlur={true}
          onEdit={() => setIsEditing(true)} onSubmit={() => setIsEditing(false)}
          onChange={onHandleTitleChange || handleChangeTitle} onCancel={() => setIsEditing(false)}
          data-testid="editable-component-title">
        <EditablePreview className="title-text"/>
        <EditableInput className="title-text-input"/>
      </Editable>
      <Flex className="header-right">
        <Button className="component-minimize-button">
          <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}
              onPointerDown={onMinimizeTile}/>
        </Button>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onPointerDown={()=>onCloseTile?.(tileId)}/>
      </Flex>
    </Flex>
  )
})
