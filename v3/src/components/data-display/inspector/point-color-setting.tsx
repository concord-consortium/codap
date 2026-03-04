import { useCallback, useRef, useState } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Popover, PopoverTrigger, Portal } from "@chakra-ui/react"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { ColorPickerPalette } from "../../common/color-picker-palette"

interface ColorPickerIProps {
  onColorChange: (color: string) => void
  propertyLabel: string
  swatchBackgroundColor: string
}

export const PointColorSetting = observer(function PointColorSetting({ onColorChange,
  propertyLabel, swatchBackgroundColor }: ColorPickerIProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState(swatchBackgroundColor)
  const initialColorRef = useRef(swatchBackgroundColor)
  const pointColorSettingButtonRef = useRef<HTMLButtonElement>(null)

  useOutsidePointerDown({
    ref: pointColorSettingButtonRef,
    handler: () => setOpenPopover?.(null),
    info: { name: "PointColorSetting", propertyLabel }
   })

  const closePopover = useCallback(() => {
    setOpenPopover(null)
  }, [])

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
          onClick={() => handleSwatchClick(propertyLabel)}
          ref={pointColorSettingButtonRef}
          aria-label={`${propertyLabel}: ${swatchBackgroundColor}`}
          aria-expanded={openPopover === propertyLabel}
          aria-haspopup="dialog">
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
