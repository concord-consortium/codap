import { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Popover, PopoverTrigger, Portal } from "@chakra-ui/react"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
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
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState(swatchBackgroundColor)
  const initialColorRef = useRef(swatchBackgroundColor)
  const pointColorSettingButtonRef = useRef<HTMLButtonElement>(null)

  const closePopover = useCallback(() => {
    setOpenPopover(null)
  }, [])

  // Close popover when external trigger changes (e.g. parent container scrolled)
  useEffect(() => {
    if (closeTrigger && openPopover) {
      closePopover()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeTrigger])

  useOutsidePointerDown({
    ref: pointColorSettingButtonRef,
    handler: () => setOpenPopover?.(null),
    info: { name: "PointColorSetting", propertyLabel }
   })

  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    onColorChange(value)
  }, [onColorChange])

  const rejectValue = useCallback(() => {
    onColorChange(initialColorRef.current)
    closePopover()
  }, [closePopover, onColorChange])

  const acceptValue = useCallback((color: string) => {
    updateValue(color)
    initialColorRef.current = color
    closePopover()
  }, [closePopover, updateValue])

  const handleSwatchClick = (cat: string) => {
    setOpenPopover(openPopover === cat ? null : cat)
    initialColorRef.current = swatchBackgroundColor
  }

  return (
    <Popover isLazy={true} isOpen={openPopover === propertyLabel} closeOnBlur={false} onClose={closePopover}>
      <PopoverTrigger>
        <button className={clsx("color-picker-thumb", { open: openPopover === propertyLabel })}
          onClick={disabled ? undefined : () => handleSwatchClick(propertyLabel)}
          ref={pointColorSettingButtonRef}
          aria-label={`${propertyLabel}: ${swatchBackgroundColor}`}
          aria-expanded={openPopover === propertyLabel}
          aria-haspopup="dialog"
          tabIndex={disabled ? -1 : undefined}
          aria-disabled={disabled || undefined}>
          <div className="color-picker-thumb-swatch"
            style={{ "--swatch-color": swatchBackgroundColor } as React.CSSProperties} />
        </button>
      </PopoverTrigger>
      <Portal>
        <ColorPickerPalette swatchBackgroundColor={swatchBackgroundColor} onColorChange={onColorChange}
          buttonRef={pointColorSettingButtonRef} inputValue={inputValue} onUpdateValue={updateValue}
          initialColor={initialColorRef.current} onAccept={acceptValue} onReject={rejectValue}/>
      </Portal>
    </Popover>
  )
})

PointColorSetting.displayName = "PointColorSetting"
