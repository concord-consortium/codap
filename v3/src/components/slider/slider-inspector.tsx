import React, { useEffect, useRef, useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { SliderSettingsPalette } from "./inspector-panel/slider-settings-panel"
import { t } from "../../utilities/translation/translate"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { isSliderModel } from "./slider-model"

export const SliderInspector = ({ tile, show }: ITileInspectorPanelProps) => {
  const sliderModel = tile?.content
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>()
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<HTMLDivElement>()
  const buttonRect = buttonRef.current?.getBoundingClientRect()

  useEffect(()=>{
    !show && setShowPalette(undefined)
  }, [show])

  if (!isSliderModel(sliderModel)) return null

  const handleRulerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
  }

  return (
    <InspectorPanel ref={panelRef} component="slider" show={show} setShowPalette={setShowPalette}>
      <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
        onButtonClick={handleRulerButton} setButtonRef={setButtonRef} testId={"slider-values-button"}>
        <ValuesIcon />
      </InspectorButton>
      {showPalette === "measure" &&
        <SliderSettingsPalette sliderModel={sliderModel} setShowPalette={setShowPalette}
          panelRect={panelRect} buttonRect={buttonRect}/>}
    </InspectorPanel>
  )
}
