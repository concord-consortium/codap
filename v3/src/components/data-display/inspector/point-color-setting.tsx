import { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components"
import { ColorPickerPalette } from "../../common/color-picker-palette"

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
  const initialColorRef = useRef(swatchBackgroundColor)
  const isAcceptingRef = useRef(false)

  // Close popover when external trigger changes (e.g. parent container scrolled)
  useEffect(() => {
    if (closeTrigger != null && isOpen) {
      setIsOpen(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeTrigger])

  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    onColorChange(value)
  }, [onColorChange])

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
    } else if (!isAcceptingRef.current) {
      handleRejectColor()
    }
    setIsOpen(open)
  }, [handleRejectColor, swatchBackgroundColor])

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
      <Popover>
        <Dialog className="color-picker-dialog">
          <ColorPickerPalette swatchBackgroundColor={swatchBackgroundColor} onColorChange={onColorChange}
            inputValue={inputValue} onUpdateValue={updateValue}
            onAccept={handleAcceptColor} onReject={handleReject}/>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
})

PointColorSetting.displayName = "PointColorSetting"
