import { Popover, PopoverTrigger, Portal, useDisclosure } from "@chakra-ui/react"
import { CustomEditor, CustomMarks, Editor, EFormat } from "@concord-consortium/slate-editor"
import React from "react"
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

  const { isOpen, onOpen, onClose } = useDisclosure()
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const textColor = getColor(editor, { default: true }) ?? "#000000"
  const initialColorRef = React.useRef<string>(textColor)

  function handleOpen(e: React.PointerEvent) {
    e.preventDefault()
    initialColorRef.current = getColor(editor, { default: true }) ?? "#000000"
    onOpen()
  }

  function handleSetColor(color: string) {
    setColor(editor, color)
  }

  function handleAccept(color: string) {
    handleSetColor(color)
    onClose()
  }

  function handleReject() {
    handleSetColor(initialColorRef.current)
    onClose()
  }

  return (
    <Popover isLazy={true} isOpen={isOpen} closeOnBlur={false} onClose={onClose} placement="right">
      <PopoverTrigger>
        <InspectorButton ref={buttonRef}
          testId={"text-toolbar-text-color-button"}
          tooltip={"color"}
          isActive={!!getColor(editor, { default: false })}
          onPointerDown={handleOpen}
        >
          <FormatTextColorIcon color={getColor(editor, { default: true })} />
        </InspectorButton>
      </PopoverTrigger>
      <Portal>
        <ColorPickerPalette placement={"right"} swatchBackgroundColor={"white"} onColorChange={handleSetColor}
          buttonRef={buttonRef} inputValue={textColor} onUpdateValue={handleSetColor}
          initialColor={initialColorRef.current} onAccept={handleAccept} onReject={handleReject}/>
      </Portal>
    </Popover>
  )
}
