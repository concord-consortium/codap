import { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components"
import { ColorPickerPalette } from "../../common/color-picker-palette"
import { useColorPickerPopoverOffset } from "../../common/use-color-picker-popover-offset"
import { t } from "../../../utilities/translation/translate"

interface ColorPickerIProps {
  closeTrigger?: number
  disabled?: boolean
  onColorChange: (color: string) => void
  propertyLabel: string
  swatchBackgroundColor: string
}

export const PointColorSetting = observer(function PointColorSetting({ closeTrigger, disabled, onColorChange,
  propertyLabel, swatchBackgroundColor }: ColorPickerIProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(swatchBackgroundColor)
  const { popoverRef, popoverOffset, handleExpandedChange, resetPopoverOffset } = useColorPickerPopoverOffset()
  const initialColorRef = useRef(swatchBackgroundColor)
  const isAcceptingRef = useRef(false)

  // Close popover when external trigger changes (e.g. parent container scrolled).
  // Calls handleOpenChange rather than setIsOpen directly so that uncommitted
  // color changes are rejected and the popover offset is reset.
  useEffect(() => {
    if (closeTrigger != null && isOpen) {
      handleOpenChange(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeTrigger])

  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    onColorChange(value)
  }, [onColorChange])

  const handleCommitColor = useCallback((color: string) => {
    initialColorRef.current = color
  }, [])

  const handleRejectColor = useCallback(() => {
    onColorChange(initialColorRef.current)
  }, [onColorChange])

  const handleAcceptColor = useCallback((color: string) => {
    updateValue(color)
    initialColorRef.current = color
    isAcceptingRef.current = true
    setIsOpen(false)
  }, [updateValue])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      initialColorRef.current = swatchBackgroundColor
      isAcceptingRef.current = false
    } else {
      if (!isAcceptingRef.current) {
        handleRejectColor()
      }
      resetPopoverOffset()
    }
    setIsOpen(open)
  }, [handleRejectColor, resetPopoverOffset, swatchBackgroundColor])

  const handleReject = useCallback(() => {
    handleRejectColor()
    setIsOpen(false)
  }, [handleRejectColor])

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button className={clsx("color-picker-thumb", { open: isOpen })}
        isDisabled={disabled}
        aria-label={`${propertyLabel}: ${swatchBackgroundColor}`}
        excludeFromTabOrder={disabled}>
        <div className="color-picker-thumb-swatch"
          style={{ "--swatch-color": swatchBackgroundColor } as React.CSSProperties} />
      </Button>
      <Popover
        ref={popoverRef}
        className={({defaultClassName}) => `${defaultClassName} color-picker-popover`}
        shouldFlip={false}
        offset={popoverOffset}
      >
        <Dialog className="color-picker-dialog" aria-label={t("DG.Inspector.colorPicker.dialogLabel")}>
          <ColorPickerPalette swatchBackgroundColor={swatchBackgroundColor} onColorChange={onColorChange}
            inputValue={inputValue} onUpdateValue={updateValue}
            onAccept={handleAcceptColor} onCommitColor={handleCommitColor}
            onExpandedChange={handleExpandedChange} onReject={handleReject}/>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
})

PointColorSetting.displayName = "PointColorSetting"
