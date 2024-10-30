import React, {useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {Popover, PopoverTrigger,
  Portal} from "@chakra-ui/react"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { ColorPickerPalette } from "../../common/color-picker-palette"

interface ColorPickerIProps {
  onColorChange: (color: string) => void
  propertyLabel: string
  swatchBackgroundColor: string
}

export const PointColorSetting = observer(function PointColorSetting({onColorChange,
      propertyLabel, swatchBackgroundColor}: ColorPickerIProps) {
  const popoverContainerRef = useRef<HTMLDivElement>(null)
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [initialColor, setInitialColor] = useState(swatchBackgroundColor)
  const pointColorSettingButtonRef = useRef<HTMLButtonElement>(null)

  useOutsidePointerDown({ref: popoverContainerRef, handler: () => setOpenPopover?.(null)})

  const handleSwatchClick = (cat: string) => {
    setOpenPopover(openPopover === cat ? null : cat)
    setInitialColor(swatchBackgroundColor)
  }

  return (
    <Popover isLazy={true} isOpen={openPopover === propertyLabel} closeOnBlur={false}>
      <PopoverTrigger>
        <button className="color-picker-thumb" onClick={()=>handleSwatchClick(propertyLabel)}
                ref={pointColorSettingButtonRef}>
          <div className="color-picker-thumb-swatch"
                style={{backgroundColor: swatchBackgroundColor}}/>
        </button>
      </PopoverTrigger>
      <Portal>
        <ColorPickerPalette swatchBackgroundColor={swatchBackgroundColor} onColorChange={onColorChange}
                            setOpenPopover={setOpenPopover} buttonRef={pointColorSettingButtonRef}
                            initialColor={initialColor} setInitialColor={setInitialColor}/>
      </Portal>
    </Popover>
  )
})

PointColorSetting.displayName = "PointColorSetting"
