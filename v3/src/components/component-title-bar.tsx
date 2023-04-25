import { Button, CloseButton, Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import { useDndContext, useDraggable } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { useDataSetContext } from "../hooks/use-data-set-context"
import { uiState } from "../models/ui-state"
import MinimizeIcon from "../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "./tiles/tile-base-props"
import { kCaseTableTileType } from "./case-table/case-table-defs"
import t from "../utilities/translation/translate"

import "./component-title-bar.scss"

export const ComponentTitleBar = observer(function ComponentTitleBar(
    { tile, getTitle, children, onCloseTile }: ITileTitleBarProps) {
  const data = useDataSetContext()
  // perform all title-related model access here so only title is re-rendered when properties change
  const title = getTitle?.() || tile?.title || data?.name || t("DG.AppController.createDataSet.name")
  const [isEditing, setIsEditing] = useState(false)
  const [tempTitle, setTempTitle] = useState(title)
  const { active } = useDndContext()
  const dragging = !!active
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  const draggableId = `${tileType}-${tileId}`
  const draggableOptions = {id: draggableId, disabled: isEditing}
  const {attributes, listeners, setActivatorNodeRef} = useDraggable(draggableOptions)
  const classes = clsx("component-title-bar", `${tileType}-title-bar`, {focusTile: uiState.isFocusedTile(tile?.id)})

  useEffect(() => {
    setTempTitle(title)
  }, [title])

  const handleChangeTitle = (nextValue?: string) => {
    if (tile != null && nextValue) {
      setTempTitle(nextValue)
    }
  }

  const handleSubmitTitleChange = () => {
    setIsEditing(false)
    if (tile != null) {
      tile.setTitle(tempTitle)
      if (tileType === kCaseTableTileType) {
        data?.setName(tempTitle)
      }
    }
  }

  return (
    <Flex className={classes}
        ref={setActivatorNodeRef} {...listeners} {...attributes}>
      {children}
      <Editable value={tempTitle} className="title-bar" isPreviewFocusable={!dragging} submitOnBlur={true}
          onEdit={() => setIsEditing(true)} onSubmit={handleSubmitTitleChange}
          onChange={handleChangeTitle} onCancel={() => setIsEditing(false)}
          data-testid="editable-component-title">
        <EditablePreview className="title-text"/>
        <EditableInput className="title-text-input"/>
      </Editable>
      <Flex className="header-right">
        <Button className="component-minimize-button">
          <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        </Button>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onPointerDown={()=>onCloseTile?.(tileId)}/>
      </Flex>
    </Flex>
  )
})
