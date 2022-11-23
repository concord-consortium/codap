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
        <InspectorButton icon={<ScaleDataIcon />} type={"resize"} />
        <InspectorButton icon={<HideShowIcon />} type={"hideShow"}/>
        <InspectorButton icon={<ValuesIcon />} type={"displayValues"} />
        <InspectorButton icon={<BarChartIcon />} type={"displayConfiguration"} />
        <InspectorButton icon={<StylesIcon />} type={"displayStyles"} />
        <InspectorButton icon={<CameraIcon />} type={"makeImage"} />
      </InspectorPanel>
    : null
  )
}
