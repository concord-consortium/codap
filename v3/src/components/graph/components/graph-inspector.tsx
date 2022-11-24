import React from "react"
import { InspectorButton, InspectorPanel } from "../../inspector-panel"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import BarChartIcon from "../../../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../../../assets/icons/icon-styles.svg"
import CameraIcon from "../../../assets/icons/icon-camera.svg"

interface IProps {
  show: boolean
}

export const GraphInspector = ({ show }: IProps) => {
  return (show
    ? <InspectorPanel component="graph">
        <InspectorButton tooltip={"DG.Inspector.resize.toolTip"} showMoreOptions={false}
          testId={"graph-resize-button"} >
          <ScaleDataIcon />
        </InspectorButton>
        <InspectorButton tooltip={"DG.Inspector.hideShow.toolTip"} showMoreOptions={true}
          testId={"graph-hide-show-button"}>
          <HideShowIcon />
        </InspectorButton>
        <InspectorButton tooltip={"DG.Inspector.displayValues.toolTip"} showMoreOptions={true}
          testId={"graph-display-values-button"}>
          <ValuesIcon />
        </InspectorButton>
        <InspectorButton tooltip={"DG.Inspector.displayConfiguration.toolTip"} showMoreOptions={true}
          testId={"graph-display-config-button"}>
          <BarChartIcon />
        </InspectorButton>
        <InspectorButton tooltip={"DG.Inspector.displayStyles.toolTip"} showMoreOptions={true}
          testId={"graph-display-styles-button"}>
          <StylesIcon />
        </InspectorButton>
        <InspectorButton tooltip={"DG.Inspector.makeImage.toolTip"} showMoreOptions={true}
          testId={"graph-camera-button"}>
        <CameraIcon />
        </InspectorButton>
      </InspectorPanel>
    : null
  )
}
