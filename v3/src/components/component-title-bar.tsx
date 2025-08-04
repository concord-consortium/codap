import { Button, Flex, Input } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { getTitle } from "../models/tiles/tile-content-info"
import { updateTileNotification } from "../models/tiles/tile-notifications"
import { uiState } from "../models/ui-state"
import CloseIcon from "../assets/icons/close-tile-icon.svg"
import MinimizeIcon from "../assets/icons/minimize-tile-icon.svg"
import { ITileTitleBarProps } from "./tiles/tile-base-props"
import { t } from "../utilities/translation/translate"
import { logMessageWithReplacement } from "../lib/log-message"

import "./component-title-bar.scss"

export const ComponentTitleBar = observer(function ComponentTitleBar(props: ITileTitleBarProps) {
  const {
    tile, children, onHandleTitleChange, onMinimizeTile, onCloseTile, onMoveTilePointerDown,
    initiateEditTitle, preventTitleChange
  } = props
  // perform all title-related model access here so only title is re-rendered when properties change
  const title = (tile && getTitle?.(tile)) || tile?.title || ""
  const [isEditing, setIsEditing] = useState(initiateEditTitle)
  const [editingTitle, setEditingTitle] = useState(title)
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  const classes = clsx("component-title-bar", `${tileType}-title-bar`, {focusTile: uiState.isFocusedTile(tile?.id)})
  const [isHovering, setIsHovering] = useState(false)
  const blankTitle = "_____"

  const handleChangeTitle = (nextValue?: string) => {
    if (tile != null && nextValue !== undefined) {
      tile.applyModelChange(() => {
        tile.setUserTitle(nextValue)
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
  const handleMinimizePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onMinimizeTile?.()
  }
  return (
    <Flex className={classes} onMouseOver={()=>setIsHovering(true)} onMouseOut={()=>setIsHovering(false)}
          onPointerDown={onMoveTilePointerDown}>
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
        <Button
          className="component-title-bar-button component-minimize-button"
          data-testid="component-minimize-button"
          onPointerDown={handleMinimizePointerDown}
          title={t("DG.Component.minimizeComponent.toolTip")}
        >
          <MinimizeIcon className="component-minimize-icon"/>
        </Button>
        {!tile?.cannotClose &&
          <Button
            className="component-title-bar-button component-close-button"
            data-testid="component-close-button"
            onPointerDown={() => onCloseTile?.(tileId)}
            title={t("DG.Component.closeComponent.toolTip")}
          >
            <CloseIcon className="component-close-icon"/>
          </Button>
        }
      </Flex>
    </Flex>
  )
})
