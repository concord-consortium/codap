import { Button, Flex, Input } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { kTileTitleBarAriaRole } from "../accessibility-constants"
import CloseIcon from "../assets/icons/close-tile-icon.svg"
import RedoIcon from "../assets/icons/icon-redo.svg"
import UndoIcon from "../assets/icons/icon-undo.svg"
import MinimizeIcon from "../assets/icons/minimize-tile-icon.svg"
import { useRovingToolbarFocus } from "../hooks/use-roving-toolbar-focus"
import { logMessageWithReplacement } from "../lib/log-message"
import { appState } from "../models/app-state"
import { getRedoStringKey, getUndoStringKey } from "../models/history/codap-undo-types"
import { getTitle } from "../models/tiles/tile-content-info"
import { updateTileNotification } from "../models/tiles/tile-notifications"
import { uiState } from "../models/ui-state"
import { t } from "../utilities/translation/translate"
import { If } from "./common/if"
import { ITileTitleBarProps } from "./tiles/tile-base-props"

import "./component-title-bar.scss"

const kInputPadding = 10

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
  const classes = clsx("component-title-bar", `${tileType}-title-bar`, {
    focusTile: uiState.isFocusedTile(tile?.id) || uiState.isHoveredTile(tile?.id),
    // Add class when minimize/close buttons are present (embeddedMode) to adjust undo/redo positioning
    "has-window-buttons": uiState.allowComponentMinimize || uiState.allowComponentClose
  })
  const [isHovering, setIsHovering] = useState(false)
  const blankTitle = "_____"
  const hasDraggedRef = useRef(false)
  const pointerStart = useRef<{x: number, y: number} | null>(null)

  // Input sizing is based on https://stackoverflow.com/questions/8100770/auto-scaling-inputtype-text-to-width-of-value
  const [inputWidth, setInputWidth] = useState(2 * kInputPadding)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const titleButtonRef = useRef<HTMLButtonElement>(null)
  const { onFocusCapture, onKeyDownCapture } = useRovingToolbarFocus({
    enabled: !isEditing,
    dependencies: [isEditing],
    getItems: () => {
      if (!toolbarRef.current) return []
      return Array.from(
        toolbarRef.current.querySelectorAll<HTMLElement>("[data-titlebar-toolbar-item='true']")
      )
    },
    orientation: "horizontal",
    persistenceKey: `titlebar-${tileId}`
  })

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
      // Return focus to title button after React re-renders it
      requestAnimationFrame(() => titleButtonRef.current?.focus())
    }
  }

  const handleCancel = () => {
    setEditingTitle(title)
    setIsEditing(false)
    requestAnimationFrame(() => titleButtonRef.current?.focus())
  }

  const resizeInput = (text: string) => {
    if (!measureRef.current) return

    measureRef.current.textContent = text
    setInputWidth(measureRef.current.offsetWidth + 2 * kInputPadding)
  }

  const handleTitlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    hasDraggedRef.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleTitlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerStart.current) {
      const dx = Math.abs(e.clientX - pointerStart.current.x)
      const dy = Math.abs(e.clientY - pointerStart.current.y)
      if (dx > 3 || dy > 3) { // 3px threshold
        hasDraggedRef.current = true
      }
    }
  }

  const handleTitleClick = () => {
    if (!preventTitleChange && !hasDraggedRef.current) {
      setIsEditing(true)
      setEditingTitle(title)
      resizeInput(title)
    }
    // Reset for next interaction so stale drag state doesn't block future activations
    hasDraggedRef.current = false
    pointerStart.current = null
  }

  const handleInputPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    e.stopPropagation()
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

  const handleInput = () => {
    if (inputRef.current) resizeInput(inputRef.current.value)
  }

  useEffect(() => {
    if (isEditing && measureRef.current) {
      resizeInput(editingTitle)
    }
  }, [isEditing, editingTitle])

  const titleBarClasses = clsx("title-bar", { "not-draggable": !uiState.allowComponentMove })

  return (
    <Flex className={classes} onMouseOver={()=>setIsHovering(true)} onMouseOut={()=>setIsHovering(false)}
          onPointerDown={onMoveTilePointerDown}>
      <div role={kTileTitleBarAriaRole} aria-label={t("V3.titleBar.toolbar.ariaLabel")} className="title-bar-toolbar"
           ref={toolbarRef} onFocusCapture={onFocusCapture} onKeyDownCapture={onKeyDownCapture}>
        {children}
        <div className={titleBarClasses} data-testid="component-title-bar">
          <span className="title-text-measure" ref={measureRef} />
          {isEditing && !preventTitleChange
            ? (
              <Input
                aria-label={t("V3.app.component.editTitle.ariaLabel")}
                autoFocus={true}
                className="title-text-input"
                data-testid="title-text-input"
                onBlur={() => handleSubmit(editingTitle)}
                onChange={(e) => setEditingTitle(e.target.value)}
                onFocus={(e) => e.target.select()}
                onInput={handleInput}
                onKeyDown={handleInputKeyDown}
                onPointerDown={handleInputPointerDown}
                ref={inputRef}
                style={{ width: `${inputWidth}px` }}
                value={editingTitle}
              />
            ) : (
              <button
                aria-description={t("V3.app.component.editTitle.ariaLabel")}
                className="title-text"
                data-testid="title-text"
                data-titlebar-toolbar-item="true"
                id={`tile-title-${tileId}`}
                ref={titleButtonRef}
                onClick={handleTitleClick}
                onPointerDown={handleTitlePointerDown}
                onPointerMove={handleTitlePointerMove}
              >
                <span className="title-text-content">
                  {title || (isHovering ? blankTitle : "")}
                </span>
              </button>
            )
          }
        </div>
        <If condition={uiState.shouldShowUndoRedoInComponentTitleBar}>
          <Flex className="title-bar-undo-redo" gap={1}>
            <Button
              className="component-title-bar-button title-bar-undo-button"
              data-testid="title-bar-undo-button"
              data-titlebar-toolbar-item="true"
              aria-disabled={!appState.document?.canUndo}
              onClick={() => appState.document?.canUndo && appState.document?.undoLastAction()}
              onPointerDown={(e) => e.stopPropagation()}
              title={t(getUndoStringKey(appState.document?.treeManagerAPI?.undoManager))}
              aria-label={t("DG.mainPage.mainPane.undoButton.title")}
            >
              <UndoIcon className="icon-undo"/>
            </Button>
            <Button
              className="component-title-bar-button title-bar-redo-button"
              data-testid="title-bar-redo-button"
              data-titlebar-toolbar-item="true"
              aria-disabled={!appState.document?.canRedo}
              onClick={() => appState.document?.canRedo && appState.document?.redoLastAction()}
              onPointerDown={(e) => e.stopPropagation()}
              title={t(getRedoStringKey(appState.document?.treeManagerAPI?.undoManager))}
              aria-label={t("DG.mainPage.mainPane.redoButton.title")}
            >
              <RedoIcon className="icon-redo"/>
            </Button>
          </Flex>
        </If>
        <Flex className={clsx("header-right", { disabled: isEditing })}>
          <If condition={uiState.allowComponentMinimize}>
            <Button
              className="component-title-bar-button component-minimize-button"
              data-testid="component-minimize-button"
              data-titlebar-toolbar-item="true"
              onClick={onMinimizeTile}
              onPointerDown={(e) => e.stopPropagation()}
              title={t("DG.Component.minimizeComponent.toolTip")}
              aria-label={t("DG.Component.minimizeComponent.toolTip")}
            >
              <MinimizeIcon className="component-minimize-icon"/>
            </Button>
          </If>
          <If condition={uiState.allowComponentClose && !tile?.cannotClose}>
            <Button
              className="component-title-bar-button component-close-button"
              data-testid="component-close-button"
              data-titlebar-toolbar-item="true"
              onClick={() => onCloseTile?.(tileId)}
              onPointerDown={(e) => e.stopPropagation()}
              title={t("DG.Component.closeComponent.toolTip")}
              aria-label={t("DG.Component.closeComponent.toolTip")}
            >
              <CloseIcon className="component-close-icon"/>
            </Button>
          </If>
        </Flex>
      </div>
    </Flex>
  )
})
