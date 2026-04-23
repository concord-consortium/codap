import { useDisclosure } from "@chakra-ui/react"
import {
  createEditor, defaultHotkeyMap, ImageElement, LinkElement, ReactEditor, Slate, SlateEditor, slateToText
} from "@concord-consortium/slate-editor"
import { observer } from "mobx-react-lite"
import { addDisposer, onPatch } from "mobx-state-tree"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useMemo } from "use-memo-one"
import { useTileInspectorContext } from "../../hooks/use-tile-inspector-context"
import { useTileSelectionContext } from "../../hooks/use-tile-selection-context"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { mstReaction } from "../../utilities/mst-reaction"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isTextModel, modelValueToEditorValue } from "./text-model"
import { TextTileInspectorContent } from "./text-tile-inspector-content"

import "@concord-consortium/slate-editor/dist/index.css"
import "./text-tile.scss"

export const TextTile = observer(function TextTile({ tile }: ITileBaseProps) {
  const textModel = isTextModel(tile?.content) ? tile.content : undefined
  const [ , setTileInspectorContent] = useTileInspectorContext()
  const { isTileSelected } = useTileSelectionContext()
  const animationFrame = useRef<number | null>(null)
  const textOnFocus = useRef("")

  const { isOpen: isImageDialogOpen, onClose: closeImageDialog, onOpen: openImageDialog } = useDisclosure()
  const editImage = useRef<Maybe<ImageElement>>()

  const { isOpen: isLinkDialogOpen, onClose: closeLinkDialog, onOpen: openLinkDialog } = useDisclosure()
  const editLink = useRef<Maybe<LinkElement>>()

  const [initialValue, setInitialValue] = useState(() => modelValueToEditorValue(textModel?.value))
  // changes to this value trigger a remount of the slate editor
  const mountKey = useRef(0)
  const editor = useMemo(() => {
    // slate doesn't have a convenient API for replacing the value in an existing editor,
    // so we create a new editor instance when the value changes externally (e.g. undo/redo).
    initialValue  // eslint-disable-line @typescript-eslint/no-unused-expressions
    ++mountKey.current
    const _editor = createEditor({
      imageOptions: {
        onDoubleClick: (_, element) => {
          editImage.current = element
          openImageDialog()
        }
      },
      linkOptions: {
        onClick: (_, element) => {
          if (element.href) {
            window.open(element.href, "_blank", "noopener,noreferrer")
          }
        },
        onDoubleClick: (_, element) => {
          editLink.current = element
          openLinkDialog()
        }
      }
    })
    textModel?.setEditor(_editor)
    return _editor
  }, [initialValue, openImageDialog, openLinkDialog, textModel])

  const focusEditor = useCallback(() => {
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
    animationFrame.current = requestAnimationFrame(() => ReactEditor.focus(editor))
  }, [editor])

  useEffect(() => {
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
    }
  }, [])

  useEffect(() => {
    setTileInspectorContent(
      new TextTileInspectorContent(
        isImageDialogOpen,
        openImageDialog,
        closeImageDialog,
        editImage,
        isLinkDialogOpen,
        openLinkDialog,
        closeLinkDialog,
        editLink
      )
    )
  }, [isImageDialogOpen, openImageDialog, closeImageDialog,
      isLinkDialogOpen, openLinkDialog, closeLinkDialog, setTileInspectorContent])

  useEffect(() => {
    return mstReaction(
      () => isTileSelected() && tile?.transitionComplete,
      isSelected => {
        // RAF to delay focus request until after model processing completes
        if (isSelected) {
          focusEditor()
        }
      },
      { name: "FocusEditorOnTileSelect" }, tile
    )
  }, [editor, focusEditor, isTileSelected, tile])

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

  function handleChange() {
    textModel?.incEditorChange()
  }

  function handleBlur() {
    // update the model on blur, not on every change (e.g. keystroke)
    if (textModel && !textModel.isEquivalent(editor.children)) {
      // We only get here if the text or style has changed
      const textDidChange = textOnFocus.current !== slateToText(editor.children)
      textModel?.applyModelChange(() => {
        textModel.setValueFromEditor(editor.children)
      }, {
        // log only when the text actually changed, e.g. not on style changes
        // Note that logging of text changes was commented out in v2 in build 0601. ¯\_(ツ)_/¯
        // For now, we log just the text content, not the full JSON-stringified slate value.
        log: textDidChange ? () => `Edited text component: ${textModel.textContent}` : undefined,
        undoStringKey: "DG.Undo.textComponent.edit",
        redoStringKey: "DG.Redo.textComponent.edit",
        notify: textDidChange ? () => updateTileNotification("edit text", {}, tile) : undefined
      })
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    focusEditor()
  }

  return (
    <div className="codap-text-content" ref={textTileRef} data-testid="codap-text-content"
      onPointerDown={handlePointerDown}>

      <Slate editor={editor} initialValue={initialValue}
        // updating key triggers remount of editor component
        key={mountKey.current}
      >
        <SlateEditor
          hotkeyMap={defaultHotkeyMap}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </Slate>
    </div>
  )
})
