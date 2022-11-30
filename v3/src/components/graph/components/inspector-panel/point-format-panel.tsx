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
  const [pointColor, setPointColor] = useState("#E6805B")
  const [pointStroke, setPointStroke] = useState("#FFFFFF")
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF")

  return (
    <InspectorPalette
      title={t("DG.Inspector.styles")}
      Icon={<StylesIcon />}
      showPalette={showFormatPalette}
      paletteTop={60}
      onPaletteBlur={()=>setShowFormatPalette(false)}
    >
      <div className="palette-form">
        <FormControl size="xs">
          <FormLabel className="form-label">{t("DG.Inspector.pointSize")}
            <Slider aria-label="point-size-slider" ml="10px" defaultValue={30} >
              <SliderTrack />
              <SliderThumb />
            </Slider>
          </FormLabel>
        </FormControl>
        <FormControl>
          <FormLabel className="form-label">{t("DG.Inspector.color")}
          <Input type="color" className="color-picker-thumb" value={pointColor}
            onChange={e => setPointColor(e.target.value)} />
          </FormLabel>
        </FormControl>
        <FormControl>
          <FormLabel className="form-label">{t("DG.Inspector.stroke")}
            <Input type="color" className="color-picker-thumb" value={pointStroke}
            onChange={e => setPointStroke(e.target.value)}/>
          </FormLabel>
        </FormControl>
        <FormControl>
          <Checkbox>{t("DG.Inspector.strokeSameAsFill")}</Checkbox>
        </FormControl>
        <FormControl>
          <FormLabel className="form-label">{t("DG.Inspector.backgroundColor")}
            <Input type="color" className="color-picker-thumb" value={backgroundColor}
            onChange={e => setBackgroundColor(e.target.value)}/>
          </FormLabel>
        </FormControl>
        <FormControl>
          <Checkbox>{t("DG.Inspector.graphTransparency")}</Checkbox>
        </FormControl>
      </div>
    </InspectorPalette>
  )
}
