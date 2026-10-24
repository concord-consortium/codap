import { observer } from "mobx-react-lite"
import { useEffect, useRef, useState } from "react"
import { t } from "../../utilities/translation/translate"
import { If } from "../common/if"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { SliderConfigPalette } from "./inspector-panel/slider-config-panel"
import { SliderScalesPalette } from "./inspector-panel/slider-scales-panel"
import { SliderSettingsPalette } from "./inspector-panel/slider-settings-panel"
import { isSliderModel } from "./slider-model"
import { isSliderTypeAvailable } from "./slider-utils"

import ConfigurationIcon from "../../assets/icons/inspector-panel/configuration-icon.svg"
import MeasureIcon from "../../assets/icons/inspector-panel/data-icon.svg"
import TimerIcon from "../../assets/icons/inspector-panel/playback-settings-icon.svg"

const kConfigPaletteId = "slider-config-palette"
const kPlaybackPaletteId = "slider-playback-palette"
const kScalePaletteId = "slider-scale-palette"

export const SliderInspector = observer(function SliderInspector({ tile, show }: ITileInspectorPanelProps) {
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

  const handleTimerButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  // offered while a range type is available, or the slider already is one (so it can be switched back to Variable)
  const showConfig = isSliderTypeAvailable("visibility") || isSliderTypeAvailable("selection") ||
                     sliderModel.isRangeSlider

  const handleConfigButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "config" ? undefined : "config")
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
      component="slider"
      setShowPalette={setShowPalette}
      show={show}
      toolbarAriaLabel={t("DG.DocumentController.sliderTitle")}
      toolbarOrientation="vertical"
      toolbarPersistenceKey="slider-inspector-toolbar"
      width="wide"
    >
      <If condition={showConfig}>
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
      </If>
      <InspectorButton
        aria-controls={kPlaybackPaletteId}
        aria-expanded={showPalette === "measure"}
        isActive={showPalette === "measure"}
        label={t("V3.Slider.Inspector.Playback")}
        onButtonClick={handleTimerButton}
        testId={"slider-values-button"}
        tooltip={t("DG.Inspector.sliderValues.toolTip")}
        top={!showConfig}
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
})
