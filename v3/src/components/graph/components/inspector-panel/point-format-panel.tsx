import React, { useState } from "react"
import { Button, Checkbox, FormControl, FormLabel, Input, Select, Slider, SliderThumb,
  SliderTrack }from "@chakra-ui/react"
import { useDataSetContext } from "../../../../hooks/use-data-set-context"
import t from "../../../../utilities/translation/translate"
import StylesIcon from "../../../../assets/icons/icon-styles.svg"

import "./point-format-modal.scss"
import { InspectorPalette } from "../../../inspector-panel"

interface IProps {
  showFormatPalette: boolean
  setShowFormatPalette: (show: boolean) => void;
}

export const PointFormatPalette = ({showFormatPalette, setShowFormatPalette}: IProps) => {
  const data = useDataSetContext()
  const [pointColor, setPointColor] = useState("#E6805B")
  const [pointStroke, setPointStroke] = useState("#FFFFFF")
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF")
  const [showColorPicker, setShowColorPicker] = useState(false)

  const colorPaletteArr = ["#ffffff", "#000000", "#ff0000", "#ff8000", "#ffff00",
                            "#008000", "#0000ff", "#4b0082", "#9400d3"]
  const handleShowColorPicker = () => {
    setShowColorPicker(true)
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.styles")}
      Icon={<StylesIcon />}
      showPalette={showFormatPalette}
      paletteTop={60}
      onPaletteBlur={()=>setShowFormatPalette(false)}
    >
      <div className="palette-form">
        <FormControl display="flex" flexDirection="column">
          <FormLabel className="form-label">{t("DG.Inspector.pointSize")}
            <Slider aria-label="point-size-slider" ml="10px" defaultValue={1}>
              <SliderTrack />
              <SliderThumb />
            </Slider>
          </FormLabel>
          <FormLabel className="form-label">{t("DG.Inspector.color")}
            <Input type="color" className="color-picker-thumb" ml="10px" value={pointColor}
              onChange={e => setPointColor(e.target.value)}/>
          </FormLabel>
          <FormLabel className="form-label">{t("DG.Inspector.stroke")}
            <Input type="color" className="color-picker-thumb" ml="10px" value={pointStroke}
              onChange={e => setPointStroke(e.target.value)}/>
          </FormLabel>
          <Checkbox>{t("DG.Inspector.strokeSameAsFill")}</Checkbox>
          <FormLabel className="form-label">{t("DG.Inspector.backgroundColor")}
            <Input type="color" className="color-picker-thumb"  ml="10px" value={backgroundColor}
              onChange={e => setBackgroundColor(e.target.value)}/>
          </FormLabel>
          <Checkbox>{t("DG.Inspector.graphTransparency")}</Checkbox>
        </FormControl>
        {showColorPicker && <ColorPicker />}
      </div>
    </InspectorPalette>
  )
}

const ColorPicker = () => {
  const [color, setColor] = useState("#E6805B")

  return (
    <Input type="color" className="color-picker-input" value={color} onChange={e => setColor(e.target.value)}/>
  )
}
