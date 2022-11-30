import React, { useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import BarChartIcon from "../../../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../../../assets/icons/icon-styles.svg"
import CameraIcon from "../../../assets/icons/icon-camera.svg"
import { HideShowMenuList } from "./inspector-panel/hide-show-menu-list"
import { PointFormatPalette } from "./inspector-panel/point-format-panel"

interface IProps {
  show: boolean
  showParentToggles?: boolean
  setShowParentToggles?: (show: boolean) => void
  showMeasuresForSelection?: boolean
  setShowMeasuresForSelection?: (show: boolean) => void
}

export const GraphInspector = ({ show, showParentToggles, setShowParentToggles,
    showMeasuresForSelection, setShowMeasuresForSelection }: IProps) => {
  const [showFormatPalette, setShowFormatPalette] = useState(false)
  return (show
    ? <>
        <InspectorPanel component="graph">
          <InspectorButton tooltip={"DG.Inspector.resize.toolTip"} showMoreOptions={false}
            testId={"graph-resize-button"} >
            <ScaleDataIcon />
          </InspectorButton>
          <InspectorMenu tooltip={"DG.Inspector.displayStyles.toolTip"}
            icon={<HideShowIcon />} testId={"graph-display-styles-button"}>
            <HideShowMenuList showParentToggles={showParentToggles} setShowParentToggles={setShowParentToggles}
              showMeasuresForSelection={showMeasuresForSelection}
              setShowMeasuresForSelection={setShowMeasuresForSelection}
            />
          </InspectorMenu>
          <InspectorButton tooltip={"DG.Inspector.displayValues.toolTip"} showMoreOptions={true}
            testId={"graph-display-values-button"}>
            <ValuesIcon />
          </InspectorButton>
          <InspectorButton tooltip={"DG.Inspector.displayConfiguration.toolTip"} showMoreOptions={true}
            testId={"graph-display-config-button"}>
            <BarChartIcon />
          </InspectorButton>
          <InspectorButton tooltip={"DG.Inspector.displayStyles.toolTip"} showMoreOptions={true}
            onButtonClick={()=>setShowFormatPalette(true)} testId={"graph-display-styles-button"}>
            <StylesIcon />
          </InspectorButton>
          <InspectorButton tooltip={"DG.Inspector.makeImage.toolTip"} showMoreOptions={true}
            testId={"graph-camera-button"}>
          <CameraIcon />
          </InspectorButton>
        </InspectorPanel>
        {showFormatPalette &&
          <PointFormatPalette showFormatPalette={showFormatPalette} setShowFormatPalette={setShowFormatPalette}/>}
      </>
    : null
  )
}
