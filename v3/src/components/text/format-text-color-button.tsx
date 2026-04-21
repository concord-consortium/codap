import { CustomEditor, CustomMarks, Editor, EFormat } from "@concord-consortium/slate-editor"
import React, { useCallback, useRef, useState } from "react"
import { Popover } from "react-aria-components"
import { ColorPickerPalette } from "../common/color-picker-palette"
import { t } from "../../utilities/translation/translate"
import { useColorPickerPopoverOffset } from "../common/use-color-picker-popover-offset"
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
  const { popoverRef, popoverOffset, handleExpandedChange, resetPopoverOffset } = useColorPickerPopoverOffset()
  const textColor = getColor(editor, { default: true }) ?? "#000000"
  const initialColorRef = useRef<string>(textColor)

  function preventFocusLoss(e: React.PointerEvent) {
    e.preventDefault()
  }

  const handleSetColor = useCallback((color: string) => {
    setColor(editor, color)
  }, [editor])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      initialColorRef.current = getColor(editor, { default: true }) ?? "#000000"
    }
    if (!open) {
      resetPopoverOffset()
    }
    setIsOpen(open)
  }, [editor, resetPopoverOffset])

  const handleAccept = useCallback((color: string) => {
    handleSetColor(color)
    handleOpenChange(false)
  }, [handleOpenChange, handleSetColor])

  const handleReject = useCallback(() => {
    handleSetColor(initialColorRef.current)
    handleOpenChange(false)
  }, [handleOpenChange, handleSetColor])

  return (
    <>
      <InspectorButton ref={triggerRef}
        testId={"text-toolbar-text-color-button"}
        tooltip={"color"}
        isActive={!!getColor(editor, { default: false })}
        onButtonClick={() => handleOpenChange(true)}
        onPointerDown={preventFocusLoss}
      >
        <FormatTextColorIcon color={getColor(editor, { default: true })} />
      </InspectorButton>
      <Popover ref={popoverRef} shouldFlip={false} crossOffset={popoverOffset} triggerRef={triggerRef}
        className={({defaultClassName}) => `${defaultClassName} color-picker-popover`}
        isOpen={isOpen} onOpenChange={handleOpenChange} placement="end"
        aria-label={t("V3.Inspector.colorPicker.dialogLabel")}>
        <ColorPickerPalette swatchBackgroundColor={textColor} onColorChange={handleSetColor}
          inputValue={textColor} onUpdateValue={handleSetColor}
          onAccept={handleAccept} onExpandedChange={handleExpandedChange} onReject={handleReject}/>
      </Popover>
    </>
  )
}
