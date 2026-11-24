import { useEffect, useRef, useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import { SliderSettingsPalette } from "./inspector-panel/slider-settings-panel"
import { t } from "../../utilities/translation/translate"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { isSliderModel } from "./slider-model"
import { SliderScalesPalette } from "./inspector-panel/slider-scales-panel"
import { SliderConfigPalette } from "./inspector-panel/slider-config-panel"

import TimerIcon from "../../assets/icons/inspector-panel/playback-settings-icon.svg"
import MeasureIcon from "../../assets/icons/inspector-panel/data-icon.svg"
import ConfigurationIcon from "../../assets/icons/inspector-panel/configuration-icon.svg"

const kPlaybackPaletteId = "slider-playback-palette"
const kScalePaletteId = "slider-scale-palette"
const kConfigPaletteId = "slider-config-palette"

export const SliderInspector = ({ tile, show }: ITileInspectorPanelProps) => {
  const sliderModel = tile?.content
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<Element | null>(null)
  const buttonRect = buttonRef.current?.getBoundingClientRect()

  useEffect(()=>{
    !show && setShowPalette(undefined)
  }, [show])

  if (!isSliderModel(sliderModel)) return null

  const handleConfigButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "config" ? undefined : "config")
  }

  const handleTimerButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const handleScaleButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "scale" ? undefined : "scale")
  }

  const renderPaletteIfAny = () => {
    switch (showPalette) {
      case "config":
        return <SliderConfigPalette id={kConfigPaletteId} sliderModel={sliderModel}
                                    setShowPalette={setShowPalette}
                                    panelRect={panelRect} buttonRect={buttonRect}/>
      case "measure":
        return <SliderSettingsPalette id={kPlaybackPaletteId} sliderModel={sliderModel}
                                      setShowPalette={setShowPalette}
                                      panelRect={panelRect} buttonRect={buttonRect}/>
      case "scale":
        return <SliderScalesPalette id={kScalePaletteId} sliderModel={sliderModel}
                                      setShowPalette={setShowPalette}
                                      panelRect={panelRect} buttonRect={buttonRect}/>
      default:
        return null
    }
  }

  return (
    <InspectorPanel
      ref={panelRef}
      component="slider-new"
      setShowPalette={setShowPalette}
      show={show}
      toolbarAriaLabel={t("DG.DocumentController.sliderTitle")}
      toolbarOrientation="vertical"
      toolbarPersistenceKey="slider-inspector-toolbar"
      width="wide"
    >
      {/* PROTOTYPE: Config button, labelled and iconned like the graph's */}
      <InspectorButton
        aria-controls={kConfigPaletteId}
        aria-expanded={showPalette === "config"}
        isActive={showPalette === "config"}
        label={t("V3.graph.Inspector.Config")}
        onButtonClick={handleConfigButton}
        testId={"slider-config-button"}
        tooltip={t("V3.Inspector.sliderConfig.toolTip")}
        top={true}
      >
        <ConfigurationIcon />
      </InspectorButton>
      <InspectorButton
        aria-controls={kPlaybackPaletteId}
        aria-expanded={showPalette === "measure"}
        isActive={showPalette === "measure"}
        label={t("V3.Slider.Inspector.Playback")}
        onButtonClick={handleTimerButton}
        testId={"slider-values-button"}
        tooltip={t("V3.Inspector.sliderPlayback.toolTip")}
      >
        <TimerIcon />
      </InspectorButton>
      <InspectorButton
        aria-controls={kScalePaletteId}
        aria-expanded={showPalette === "scale"}
        bottom={true}
        isActive={showPalette === "scale"}
        label={t("V3.Slider.Inspector.Scale")}
        onButtonClick={handleScaleButton}
        testId={"slider-scale-button"}
        tooltip={t("V3.Inspector.sliderScales.toolTip")}
      >
        <MeasureIcon />
      </InspectorButton>
      {renderPaletteIfAny()}
    </InspectorPanel>
  )
}
