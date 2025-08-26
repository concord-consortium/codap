import { createEditor, defaultHotkeyMap, ReactEditor, Slate, SlateEditor } from "@concord-consortium/slate-editor"
import { observer } from "mobx-react-lite"
import { addDisposer, onPatch } from "mobx-state-tree"
import React, { useEffect, useRef, useState } from "react"
import { useMemo } from "use-memo-one"
import { useTileSelectionContext } from "../../hooks/use-tile-selection-context"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { mstReaction } from "../../utilities/mst-reaction"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { isTextModel, modelValueToEditorValue } from "./text-model"
import { TextToolbar } from "./text-toolbar"

import "@concord-consortium/slate-editor/dist/index.css"
import "./text-tile.scss"

export const TextTile = observer(function TextTile({ tile }: ITileBaseProps) {
  const textModel = isTextModel(tile?.content) ? tile.content : undefined
  const { isTileSelected } = useTileSelectionContext()
  const textOnFocus = useRef("")

  const [initialValue, setInitialValue] = useState(() => modelValueToEditorValue(textModel?.value))
  // changes to this value trigger a remount of the slate editor
  const mountKey = useRef(0)
  const editor = useMemo(() => {
    // slate doesn't have a convenient API for replacing the value in an existing editor,
    // so we create a new editor instance when the value changes externally (e.g. undo/redo).
    initialValue  // eslint-disable-line @typescript-eslint/no-unused-expressions
    ++mountKey.current
    return createEditor()
  }, [initialValue])

  useEffect(() => {
    let animationFrame: number
    const disposer = tile && mstReaction(
      () => isTileSelected() && tile?.transitionComplete,
      isSelected => {
        // RAF to delay focus request until after model processing completes
        if (isSelected) {
          animationFrame = requestAnimationFrame(() => ReactEditor.focus(editor))
        }
      },
      { name: "FocusEditorOnTileSelect" }, tile
    )
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      disposer?.()
    }
  }, [editor, isTileSelected, tile])

  const textTileRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (textModel) {
      return addDisposer(textModel, onPatch(textModel, ({ op, path }) => {
        if (op === "replace" && path === "/value") {
          // don't respond to patch if the value is being set explicitly,
          // only external changes, e.g. undo/redo
          if (!textModel.isSettingValue) {
            // set the new value and remount the editor
            setInitialValue(modelValueToEditorValue(textModel?.value))
          }
        }
      }))
    }
  }, [textModel])

  if (!textModel) return null

  function handleFocus() {
    // remember text content on focus so we can compare it on blur
    textOnFocus.current = textModel?.textContent ?? ""
  }

  function handleBlur() {
    // update the model on blur, not on every change (e.g. keystroke)
    if (textModel && !textModel.isEquivalent(editor.children)) {
      // handleBlur only gets called if the text or style has changed
      textModel?.applyModelChange(() => {
        textModel.setValueFromEditor(editor.children)
      }, {
        // Note that logging of text changes was commented out in v2 in build 0601. ¯\_(ツ)_/¯
        // For now, we log just the text content, not the full JSON-stringified slate value. This means that
        // style changes will trigger logging but won't be reflected in the log message.
        log: () => `Edited text component: ${textModel.textContent}`,
        undoStringKey: "DG.Undo.textComponent.edit",
        redoStringKey: "DG.Redo.textComponent.edit",
        notify: () => updateTileNotification("edit text", {}, tile)
      })
    }
  }

  return (
    <div className="codap-text-content" ref={textTileRef} data-testid="codap-text-content">
      <Slate editor={editor} initialValue={initialValue}
        // updating key triggers remount of editor component
        key={mountKey.current}
      >
        <SlateEditor
          hotkeyMap={defaultHotkeyMap}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <TextToolbar />
      </Slate>
    </div>
  )
})
