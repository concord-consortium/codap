import React, { useState } from "react"
import { Checkbox, Flex, FormControl, FormLabel, Input, Slider, SliderThumb,
  SliderTrack }from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import { IGraphModel } from "../../models/graph-model"
import { InspectorPalette } from "../../../inspector-panel"
import StylesIcon from "../../../../assets/icons/icon-styles.svg"

import "./point-format-panel.scss"

interface IProps {
  graphModel: IGraphModel
}

export const PointFormatPalette = ({graphModel}: IProps) => {
  const [pointColor, setPointColor] = useState<string>("#E6805B")
  const [pointStroke, setPointStroke] = useState<string>("#FFFFFF")

  const handlePointSizeMultiplierSetting = (val: any) => {
    graphModel.setPointSizeMultiplier(val)
  }
  const handleTransparencySetting = (val: boolean) => {
    graphModel.setIsTransparent(val)
  }
  const handleBackgroundColorSetting = (color: string) => {
    graphModel.setPlotBackgroundColor(color)
  }
  const handlePointColorSetting = (color: string) => {
    setPointColor(color)
  }
  const handlePointStrokeColorSetting = (color: string) => {
    setPointStroke(color)
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.styles")}
      Icon={<StylesIcon />}
      buttonLocation={115}
      paletteTop={35}
    >
      <Flex className="palette-form" direction="column">
        <FormControl size="xs">
          <FormLabel className="form-label">{t("DG.Inspector.pointSize")}
          <Slider aria-label="point-size-slider" ml="10px" min={0} max={2} defaultValue={1} step={0.01}
            onChange={(val)=>handlePointSizeMultiplierSetting(val)}>
            <SliderTrack />
            <SliderThumb />
          </Slider>
          </FormLabel>
        </FormControl>
        <FormControl>
          <FormLabel className="form-label">{t("DG.Inspector.color")}
          <Input type="color" className="color-picker-thumb" value={pointColor}
            onChange={e => handlePointColorSetting(e.target.value)} />
          </FormLabel>
        </FormControl>
        <FormControl>
          <FormLabel className="form-label">{t("DG.Inspector.stroke")}
            <Input type="color" className="color-picker-thumb" value={pointStroke}
            onChange={e => handlePointStrokeColorSetting(e.target.value)}/>
          </FormLabel>
        </FormControl>
        <FormControl>
          <Checkbox>{t("DG.Inspector.strokeSameAsFill")}</Checkbox>
        </FormControl>
        <FormControl>
          <FormLabel className="form-label">{t("DG.Inspector.backgroundColor")}
            <Input type="color" className="color-picker-thumb" value={graphModel.plotBackgroundColor}
            onChange={e => handleBackgroundColorSetting(e.target.value)}/>
          </FormLabel>
        </FormControl>
        <FormControl>
          <Checkbox onChange={e => handleTransparencySetting(e.target.checked)}>
            {t("DG.Inspector.graphTransparency")}
          </Checkbox>
        </FormControl>
      </Flex>
    </InspectorPalette>
  )
}
