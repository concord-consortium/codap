import { CustomEditor, CustomMarks, Editor, EFormat } from "@concord-consortium/slate-editor"
import React, { useCallback, useRef, useState } from "react"
import { Dialog, Popover } from "react-aria-components"
import { ColorPickerPalette } from "../common/color-picker-palette"
import { InspectorButton } from "../inspector-panel"
import { FormatTextColorIcon } from "./format-text-color-icon"

interface IProps {
  editor: Maybe<CustomEditor>
}

function getColor(editor: Maybe<CustomEditor>, options?: { default?: boolean }) {
  const defaultColor = options?.default ? "#000000" : undefined
  if (editor) {
    return (Editor.marks(editor) as CustomMarks)?.[EFormat.color] ?? defaultColor
  }
  return defaultColor
}

function setColor(editor: Maybe<CustomEditor>, color: string) {
  if (editor) {
    editor.addMark(EFormat.color, color)
  }
}

export function FormatTextColorButton({ editor }: IProps) {

  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const textColor = getColor(editor, { default: true }) ?? "#000000"
  const initialColorRef = useRef<string>(textColor)
  const isAcceptingRef = useRef(false)

  function preventFocusLoss(e: React.PointerEvent) {
    e.preventDefault()
  }

  const handleSetColor = useCallback((color: string) => {
    setColor(editor, color)
  }, [editor])

  const handleOpen = useCallback(() => {
    initialColorRef.current = getColor(editor, { default: true }) ?? "#000000"
    isAcceptingRef.current = false
    setIsOpen(true)
  }, [editor])

  const handleAccept = useCallback((color: string) => {
    handleSetColor(color)
    isAcceptingRef.current = true
    setIsOpen(false)
  }, [handleSetColor])

  const handleReject = useCallback(() => {
    handleSetColor(initialColorRef.current)
    setIsOpen(false)
  }, [handleSetColor])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && !isAcceptingRef.current) {
      handleSetColor(initialColorRef.current)
    }
    setIsOpen(open)
  }, [handleSetColor])

  return (
    <>
      <InspectorButton ref={triggerRef}
        testId={"text-toolbar-text-color-button"}
        tooltip={"color"}
        isActive={!!getColor(editor, { default: false })}
        onButtonClick={handleOpen}
        onPointerDown={preventFocusLoss}
      >
        <FormatTextColorIcon color={getColor(editor, { default: true })} />
      </InspectorButton>
      <Popover triggerRef={triggerRef} isOpen={isOpen} onOpenChange={handleOpenChange} placement="end">
        <Dialog className="color-picker-dialog">
          <ColorPickerPalette swatchBackgroundColor={"white"} onColorChange={handleSetColor}
            inputValue={textColor} onUpdateValue={handleSetColor}
            onAccept={handleAccept} onReject={handleReject}/>
        </Dialog>
      </Popover>
    </>
  )
}
