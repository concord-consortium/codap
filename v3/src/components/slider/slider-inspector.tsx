import React, { useEffect, useRef, useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { ISliderModel } from "./slider-model"
import { SliderSettingsPalette } from "./inspector-panel/slider-settings-panel"
import t from "../../utilities/translation/translate"
import { useDndContext } from "@dnd-kit/core"

interface IProps {
  sliderModel: ISliderModel
  show: boolean
}

export const SliderInspector = ({ sliderModel, show }: IProps) => {
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>()
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<HTMLDivElement>()
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  const {active} = useDndContext()

  useEffect(()=>{
    !show && setShowPalette(undefined)
  }, [active, show])

  const handleRulerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
  }

  return (show
    ? <>
        <InspectorPanel component="slider" ref={panelRef}>
          <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
            onButtonClick={handleRulerButton} setButtonRef={setButtonRef} testId={"slider-values-button"}>
            <ValuesIcon />
          </InspectorButton>
          {showPalette === "measure" &&
            <SliderSettingsPalette sliderModel={sliderModel} setShowPalette={setShowPalette}
              panelRect={panelRect} buttonRect={buttonRect}/>}
        </InspectorPanel>
      </>
    : null
  )
}
