import React, { ReactNode } from "react"
import { Button } from "@chakra-ui/react"
import { InspectorPanel } from "../../inspector-panel"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import BarChartIcon from "../../../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../../../assets/icons/icon-styles.svg"
import CameraIcon from "../../../assets/icons/icon-camera.svg"
import MoreOptionsIcon from "../../../assets/icons/arrow-moreIconOptions.svg"

interface IProps {
  show: boolean
}

const ToolIconMap: Record<string, ReactNode> = {
  "resize": <ScaleDataIcon />,
  "hide_show": <HideShowIcon />,
  "values": <ValuesIcon />,
  "bar_chart": <BarChartIcon />,
  "styles": <StylesIcon />,
  "camera": <CameraIcon />
}

export const GraphInspector = ({ show }: IProps) => {
  return (show
    ? <InspectorPanel component="graph">
        <InspectorButton type={"resize"} />
        <InspectorButton type={"hide_show"} />
        <InspectorButton type={"values"} />
        <InspectorButton type={"bar_chart"} />
        <InspectorButton type={"styles"} />
        <InspectorButton type={"camera"} />
      </InspectorPanel>
    : null
  )
}

interface IInspectorButtonProps {
  type: string
}

const InspectorButton = ({type}:IInspectorButtonProps) => {
  return (
    <Button className="inspector-tool-button">
      {ToolIconMap[type]}
      {type !== "resize" && <MoreOptionsIcon className="more-options-icon"/>}
    </Button>
  )
}
