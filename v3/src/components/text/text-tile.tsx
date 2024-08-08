import { createEditor, defaultHotkeyMap, ReactEditor, Slate, SlateEditor } from "@concord-consortium/slate-editor"
import { observer } from "mobx-react-lite"
import { addDisposer, onPatch } from "mobx-state-tree"
import React, { useEffect, useRef, useState } from "react"
import { useMemo } from "use-memo-one"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isTextModel, modelValueToEditorValue } from "./text-model"
import { TextToolbar } from "./text-toolbar"

import "@concord-consortium/slate-editor/dist/index.css"
import "./text-tile.scss"

export const TextTile = observer(function TextTile({ tile }: ITileBaseProps) {
  const textModel = isTextModel(tile?.content) ? tile.content : undefined
  const { selectTile } = useTileModelContext()
  const textOnFocus = useRef("")

  const [initialValue, setInitialValue] = useState(() => modelValueToEditorValue(textModel?.value))
  const editor = useMemo(() => {
    // slate doesn't have a convenient API for replacing the value in an existing editor,
    // so we create a new editor instance when the value changes externally (e.g. undo/redo).
    initialValue  // eslint-disable-line no-unused-expressions
    return createEditor()
  }, [initialValue])
  // changes to this value trigger a remount of the slate editor
  const mountKey = useRef(0)

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
            ++mountKey.current
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
      const textDidChange = textOnFocus.current !== textModel.textContent
      textModel?.applyModelChange(() => {
        textModel.setValue(editor.children)
      }, {
        // log only when the text actually changed, e.g. not on style changes
        // Note that logging of text changes was commented out in v2 in build 0601. ¯\_(ツ)_/¯
        // For now, we log just the text content, not the full JSON-stringified slate value.
        log: textDidChange ? () => `Edited text component: ${textModel.textContent}` : undefined,
        undoStringKey: "DG.Undo.textComponent.edit",
        redoStringKey: "DG.Redo.textComponent.edit"
      })
    }
  }

  function handlePointerDownInTile(e: React.MouseEvent<HTMLDivElement>) {
    const isWrapperClick = e.target === textTileRef.current
    selectTile()
    if (e.target === textTileRef.current) {
      // clicks in the background of the tile focus the editor
      isWrapperClick && ReactEditor.focus(editor)
      e.preventDefault()
    }
  }

  return (
    <div className="codap-text-content" ref={textTileRef} data-testid="codap-text-content"
        onPointerDown={handlePointerDownInTile}>
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
