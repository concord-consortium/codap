import React from "react"
import {observer} from "mobx-react-lite"
import {
  Checkbox, Flex, FormControl, FormLabel, Input, Slider, SliderThumb,
  SliderTrack
} from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import {IGraphModel} from "../../models/graph-model"
import {InspectorPalette} from "../../../inspector-panel"
import StylesIcon from "../../../../assets/icons/icon-styles.svg"

import "./point-format-panel.scss"

interface IProps {
  graphModel: IGraphModel
  setShowPalette: (palette: string | undefined) => void;
}

export const PointFormatPalette = observer(({graphModel, setShowPalette}: IProps) => {
  const handlePointSizeMultiplierSetting = (val: any) => {
    graphModel.setPointSizeMultiplier(val)
  }
  const handleTransparencySetting = (isTransparent: boolean) => {
    graphModel.setIsTransparent(isTransparent)
  }
  const handleBackgroundColorSetting = (color: string) => {
    graphModel.setPlotBackgroundColor(color)
  }
  const handlePointColorSetting = (color: string) => {
    graphModel.setPointColor(color)
  }
  const handlePointStrokeColorSetting = (color: string) => {
    graphModel.setPointStrokeColor(color)
  }
  const handleStrokeSameAsPointColorSetting = (isTheSame: boolean) => {
    graphModel.setPointStrokeSameAsFill(isTheSame)
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.styles")}
      Icon={<StylesIcon/>}
      buttonLocation={115}
      paletteTop={35}
      setShowPalette={setShowPalette}
    >
      <Flex className="palette-form" direction="column">
        <FormControl size="xs">
          <FormLabel className="form-label">{t("DG.Inspector.pointSize")}
            <Slider aria-label="point-size-slider" ml="10px" min={0} max={2}
                    defaultValue={graphModel.pointSizeMultiplier} step={0.01}
                    onChange={(val) => handlePointSizeMultiplierSetting(val)}>
              <SliderTrack/>
              <SliderThumb/>
            </Slider>
          </FormLabel>
        </FormControl>
        <FormControl>
          <FormLabel className="form-label">{t("DG.Inspector.color")}
            <Input type="color" className="color-picker-thumb" value={graphModel.pointColor}
                   onChange={e => handlePointColorSetting(e.target.value)}/>
          </FormLabel>
        </FormControl>
        <FormControl isDisabled={graphModel.pointStrokeSameAsFill}>
          <FormLabel className="form-label">{t("DG.Inspector.stroke")}
            <Input type="color" className="color-picker-thumb" value={graphModel.pointStrokeColor}
                   onChange={e => handlePointStrokeColorSetting(e.target.value)}/>
          </FormLabel>
        </FormControl>
        <FormControl>
          <Checkbox
            isChecked={graphModel.pointStrokeSameAsFill}
            onChange={e => handleStrokeSameAsPointColorSetting(e.target.checked)}>
            {t("DG.Inspector.strokeSameAsFill")}
          </Checkbox>
        </FormControl>
        <FormControl isDisabled={graphModel.isTransparent}>
          <FormLabel className="form-label">{t("DG.Inspector.backgroundColor")}
            <Input type="color" className="color-picker-thumb" value={graphModel.plotBackgroundColor}
                   onChange={e => handleBackgroundColorSetting(e.target.value)}/>
          </FormLabel>
        </FormControl>
        <FormControl>
          <Checkbox
            isChecked={graphModel.isTransparent}
            onChange={e => handleTransparencySetting(e.target.checked)}>
            {t("DG.Inspector.graphTransparency")}
          </Checkbox>
        </FormControl>
      </Flex>
    </InspectorPalette>
  )
})
