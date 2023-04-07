import React, { useRef, useEffect, useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import BarChartIcon from "../../../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../../../assets/icons/icon-styles.svg"
import CameraIcon from "../../../assets/icons/icon-camera.svg"
import { HideShowMenuList } from "./inspector-panel/hide-show-menu-list"
import { PointFormatPalette } from "./inspector-panel/point-format-panel"
import { GraphMeasurePalette } from "./inspector-panel/graph-measure-panel"
import t from "../../../utilities/translation/translate"
import { useDndContext } from "@dnd-kit/core"
import { ITileInspectorPanelProps } from "../../tiles/tile-base-props"


export const GraphInspector = ({ tile, show }: ITileInspectorPanelProps) => {
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>()
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<HTMLDivElement>()
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  const {active} = useDndContext()

  useEffect(()=>{
    !show && setShowPalette(undefined)
  }, [active, show])

  const handleResize = () => {
    setShowPalette(undefined)
  }

  const handleRulerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const handleBrushButton = () => {
    setShowPalette(showPalette === "format" ? undefined : "format")
  }

  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
  }

  return (
    <InspectorPanel ref={panelRef} component="graph" show={show} setShowPalette={setShowPalette}>
      <InspectorButton tooltip={t("DG.Inspector.resize.toolTip")} showMoreOptions={false}
        testId={"graph-resize-button"} onButtonClick={handleResize}>
        <ScaleDataIcon />
      </InspectorButton>
      <InspectorMenu tooltip={t("DG.Inspector.hideShow.toolTip")}
        icon={<HideShowIcon />} testId={"graph-hide-show-button"} >
        <HideShowMenuList tile={tile} />
      </InspectorMenu>
      <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
        onButtonClick={handleRulerButton} setButtonRef={setButtonRef} testId={"graph-display-values-button"}>
        <ValuesIcon />
      </InspectorButton>
      <InspectorButton tooltip={t("DG.Inspector.displayConfiguration.toolTip")} showMoreOptions={true}
        testId={"graph-display-config-button"}>
        <BarChartIcon />
      </InspectorButton>
      <InspectorButton tooltip={t("DG.Inspector.displayStyles.toolTip")} showMoreOptions={true}
        onButtonClick={handleBrushButton} setButtonRef={setButtonRef} testId={"graph-display-styles-button"}>
        <StylesIcon />
      </InspectorButton>
      <InspectorButton tooltip={t("DG.Inspector.makeImage.toolTip")} showMoreOptions={true}
        testId={"graph-camera-button"}>
      <CameraIcon />
      </InspectorButton>
      {showPalette === "format" &&
        <PointFormatPalette tile={tile} setShowPalette={setShowPalette}
          panelRect={panelRect} buttonRect={buttonRect}/>}
      {showPalette === "measure" &&
        <GraphMeasurePalette tile={tile} setShowPalette={setShowPalette}
          panelRect={panelRect} buttonRect={buttonRect}/>}
    </InspectorPanel>
  )
}
