import { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Button, DialogTrigger, Popover } from "react-aria-components"
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

  // Close popover when external trigger changes (e.g. parent container scrolled).
  // Calls handleOpenChange rather than setIsOpen directly so that cleanup
  // (e.g. resetPopoverOffset) runs.
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

  // handleOpenChange itself always accepts (the current color stays).
  // Escape rejection is handled by handleReject, which reverts the color
  // before calling handleOpenChange(false).
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      initialColorRef.current = swatchBackgroundColor
    }
    if (!open) {
      resetPopoverOffset()
    }
    setIsOpen(open)
  }, [resetPopoverOffset, swatchBackgroundColor])

  const handleAcceptColor = useCallback((color: string) => {
    updateValue(color)
    handleOpenChange(false)
  }, [handleOpenChange, updateValue])

  const handleReject = useCallback(() => {
    onColorChange(initialColorRef.current)
    handleOpenChange(false)
  }, [handleOpenChange, onColorChange])

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
        aria-label={t("DG.Inspector.colorPicker.dialogLabel")}
      >
        <ColorPickerPalette swatchBackgroundColor={swatchBackgroundColor} onColorChange={onColorChange}
          inputValue={inputValue} onUpdateValue={updateValue}
          onAccept={handleAcceptColor}
          onExpandedChange={handleExpandedChange} onReject={handleReject}/>
      </Popover>
    </DialogTrigger>
  )
})

PointColorSetting.displayName = "PointColorSetting"
