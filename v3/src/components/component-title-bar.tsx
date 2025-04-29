import { Button, CloseButton, Flex, Input } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { IUseDraggableTile, useDraggableTile } from "../hooks/use-drag-drop"
import { getTitle } from "../models/tiles/tile-content-info"
import { updateTileNotification } from "../models/tiles/tile-notifications"
import { uiState } from "../models/ui-state"
import MinimizeIcon from "../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "./tiles/tile-base-props"
import { t } from "../utilities/translation/translate"
import { logMessageWithReplacement } from "../lib/log-message"

import "./component-title-bar.scss"

export const ComponentTitleBar = observer(function ComponentTitleBar({
  tile, children, onHandleTitleChange, onMinimizeTile, onCloseTile, preventTitleChange, initiateEditTitle
}: ITileTitleBarProps) {
  // perform all title-related model access here so only title is re-rendered when properties change
  const title = (tile && getTitle?.(tile)) || tile?.title || ""
  const [isEditing, setIsEditing] = useState(initiateEditTitle)
  const [editingTitle, setEditingTitle] = useState(title)
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  const draggableOptions: IUseDraggableTile = { prefix: tileType || "tile", tileId, disabled: isEditing }
  const {attributes, listeners, setActivatorNodeRef} = useDraggableTile(draggableOptions)
  const classes = clsx("component-title-bar", `${tileType}-title-bar`, {focusTile: uiState.isFocusedTile(tile?.id)})
  const [isHovering, setIsHovering] = useState(false)
  const blankTitle = "_____"

  const handleChangeTitle = (nextValue?: string) => {
    if (tile != null && nextValue !== undefined) {
      tile.applyModelChange(() => {
        tile.setTitle(nextValue)
      }, {
        notify: updateTileNotification("titleChange", { from: title, to: nextValue }, tile),
        log: logMessageWithReplacement("Title changed to: %@", {nextValue}, "component"),
        undoStringKey: "DG.Undo.component.componentTitleChange",
        redoStringKey: "DG.Redo.component.componentTitleChange"
      })
    }
  }

  const handleSubmit = (nextValue: string) => {
    const trimmedNextValue = nextValue.trim()
    if (!preventTitleChange) {
      if (onHandleTitleChange) {
        onHandleTitleChange(trimmedNextValue)
      } else {
        handleChangeTitle(trimmedNextValue)
      }
      // Assume the title was successfully changed
      setEditingTitle(trimmedNextValue)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditingTitle(title)
    setIsEditing(false)
  }

  const handleTitleClick = () => {
    if (!preventTitleChange) {
      setIsEditing(true)
      setEditingTitle(title)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e
    e.stopPropagation()
    switch (key) {
      case "Escape":
        handleCancel()
        break
      case "Enter":
      case "Tab":
        handleSubmit(editingTitle)
        break
    }
  }
  return (
    <Flex className={classes} onMouseOver={()=>setIsHovering(true)} onMouseOut={()=>setIsHovering(false)}
        ref={setActivatorNodeRef} {...listeners} {...attributes}>
      {children}
      <div className="title-bar" data-testid="component-title-bar">
        {isEditing && !preventTitleChange
          ? <Input value={editingTitle} className="title-text-input" data-testid="title-text-input" autoFocus={true}
              onChange={(e) => setEditingTitle(e.target.value)} onBlur={() => handleSubmit(editingTitle)}
              onFocus={(e) => e.target.select()} onKeyDown={handleInputKeyDown}
            />
          : <div className="title-text" data-testid="title-text" onClick={handleTitleClick}>
              {isHovering && title === "" ? blankTitle : title}
            </div>
        }
      </div>
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
