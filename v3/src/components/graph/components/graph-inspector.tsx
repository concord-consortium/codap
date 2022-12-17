import React, { useEffect, useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import BarChartIcon from "../../../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../../../assets/icons/icon-styles.svg"
import CameraIcon from "../../../assets/icons/icon-camera.svg"
import { HideShowMenuList } from "./inspector-panel/hide-show-menu-list"
import { PointFormatPalette } from "./inspector-panel/point-format-panel"
import { IGraphModel } from "../models/graph-model"
import { GraphMeasurePalette } from "./inspector-panel/graph-measure-panel"
import t from "../../../utilities/translation/translate"

interface IProps {
  graphModel: IGraphModel
  show: boolean
}

export const GraphInspector = ({ graphModel, show }: IProps) => {
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  useEffect(()=>{
    !show && setShowPalette(undefined)
  }, [show])

  const handleResize = () => {
    setShowPalette(undefined)
  }

  const handleRulerButton = () => {
    setShowPalette("measure")
  }

  const handleBrushButton = () => {
    setShowPalette("format")
  }
  return (show
    ? <>
        <InspectorPanel component="graph">
          <InspectorButton tooltip={t("DG.Inspector.resize.toolTip")} showMoreOptions={false}
            testId={"graph-resize-button"} onButtonClick={handleResize}>
            <ScaleDataIcon />
          </InspectorButton>
          <InspectorMenu tooltip={t("DG.Inspector.displayStyles.toolTip")}
            icon={<HideShowIcon />} testId={"graph-display-styles-button"} >
            <HideShowMenuList graphModel={graphModel} />
          </InspectorMenu>
          <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
            onButtonClick={handleRulerButton} testId={"graph-display-values-button"}>
            <ValuesIcon />
          </InspectorButton>
          <InspectorButton tooltip={t("DG.Inspector.displayConfiguration.toolTip")} showMoreOptions={true}
            testId={"graph-display-config-button"}>
            <BarChartIcon />
          </InspectorButton>
          <InspectorButton tooltip={t("DG.Inspector.displayStyles.toolTip")} showMoreOptions={true}
            onButtonClick={handleBrushButton} testId={"graph-display-styles-button"}>
            <StylesIcon />
          </InspectorButton>
          <InspectorButton tooltip={t("DG.Inspector.makeImage.toolTip")} showMoreOptions={true}
            testId={"graph-camera-button"}>
          <CameraIcon />
          </InspectorButton>
        </InspectorPanel>
        {showPalette === "format" &&
          <PointFormatPalette graphModel={graphModel} setShowPalette={setShowPalette}/>}
        {showPalette === "measure" &&
          <GraphMeasurePalette graphModel={graphModel} setShowPalette={setShowPalette}/>}
      </>
    : null
  )
}
