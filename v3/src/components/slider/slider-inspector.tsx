import React, { useEffect, useRef, useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import { SliderSettingsPalette } from "./inspector-panel/slider-settings-panel"
import { t } from "../../utilities/translation/translate"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { isSliderModel } from "./slider-model"
import { SliderScalesPalette } from "./inspector-panel/slider-scales-panel"

import TimerIcon from "../../assets/icons/inspector-panel/playback-settings-icon.svg"
import ScaleIcon from "../../assets/icons/inspector-panel/timeline-scale-icon.svg"

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

  const handleTimerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const handleScaleButton = () => {
    setShowPalette(showPalette === "scale" ? undefined : "scale")
  }

  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
  }

  const renderPaletteIfAny = () => {
    switch (showPalette) {
      case "measure":
        return <SliderSettingsPalette sliderModel={sliderModel} setShowPalette={setShowPalette}
                                      panelRect={panelRect} buttonRect={buttonRect}/>
      case "scale":
        return <SliderScalesPalette sliderModel={sliderModel} setShowPalette={setShowPalette}
                                      panelRect={panelRect} buttonRect={buttonRect}/>
      default:
        return null
    }
  }

  return (
    <InspectorPanel ref={panelRef} component="slider" show={show} setShowPalette={setShowPalette} width="wide">
      <InspectorButton
        label={t("V3.Slider.Inspector.Playback")}
        onButtonClick={handleTimerButton}
        setButtonRef={setButtonRef}
        testId={"slider-values-button"}
        tooltip={t("DG.Inspector.sliderValues.toolTip")}
        top={true}
      >
        <TimerIcon />
      </InspectorButton>
      <InspectorButton
        bottom={true}
        label={t("V3.Slider.Inspector.Timeline")}
        onButtonClick={handleScaleButton}
        setButtonRef={setButtonRef}
        testId={"slider-scale-button"}
        tooltip={t("V3.Inspector.sliderScales.toolTip")}
      >
        <ScaleIcon />
      </InspectorButton>
      {renderPaletteIfAny()}
    </InspectorPanel>
  )
}
