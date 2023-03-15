import React, { useEffect, useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { ISliderModel } from "./slider-model"
import { SliderSettingsPalette } from "./inspector-panel/slider-settings-panel"
import t from "../../utilities/translation/translate"

interface IProps {
  sliderModel: ISliderModel
  show: boolean
}

export const SliderInspector = ({ sliderModel, show }: IProps) => {
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  useEffect(()=>{
    !show && setShowPalette(undefined)
  }, [show])

  const handleRulerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }
  return (show
    ? <>
        <InspectorPanel component="slider">
          <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
            onButtonClick={handleRulerButton} testId={"slider-inspector-button"}>
            <ValuesIcon />
          </InspectorButton>
        </InspectorPanel>
        {showPalette === "measure" &&
          <SliderSettingsPalette sliderModel={sliderModel} setShowPalette={setShowPalette}/>}
      </>
    : null
  )
}
