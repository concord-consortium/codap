import { Box, Button } from "@chakra-ui/react"
import React from "react"
import InformationIcon from "../assets/icons/icon-info.svg"
import LayersIcon from "../assets/icons/icon-layers.svg"
import ScaleDataIcon from "../assets/icons/icon-scaleData.svg"
import BarChartIcon from "../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../assets/icons/icon-styles.svg"
import TrashIcon from "../assets/icons/icon-trash.svg"
import ValuesIcon from "../assets/icons/icon-values.svg"
import HideShowIcon from "../assets/icons/icon-hideShow.svg"
import CameraIcon from "../assets/icons/icon-camera.svg"

import "./inspector-panel.scss"

interface IProps {
  component: string
}

const InspectorIconComponent: Record<string, any> = {
  "information": <InformationIcon />,
  "layers": <LayersIcon />,
  "resize": <ScaleDataIcon />,
  "bar_chart": <BarChartIcon />,
  "styles": <StylesIcon />,
  "trash": <TrashIcon />,
  "values": <ValuesIcon />,
  "hide_show": <HideShowIcon />,
  "snapshot": <CameraIcon />
}

export const InspectorTool = (tool: string) => {
  const IconComponent = InspectorIconComponent[tool]
  return IconComponent
}

export const InspectorPanel = ({component}: IProps) => {
  const tableInpectors = ["information", "resize", "trash", "hide_show", "values"]
  const graphInspectors = ["resize", "hide_show", "values", "bar_chart", "styles", "snapshot"]
  const mapInspectors = ["resize", "hide_show", "values", "layers", "snapshot"]
  const sliderInspectors = ["values"]
  const inspectorMap: Record<string, any> = {
    "table": tableInpectors,
    "graph": graphInspectors,
    "map": mapInspectors,
    "slider": sliderInspectors
  }
  return (
    <Box className="inspector-panel" w="50px" bg="tealDark" data-testid={`inspector-panel-${component}`}>
      {inspectorMap[component].map((iType: string) => {
        return (
          <Button key={iType} className="inspector-tool-button" bg="tealDark">
            {InspectorTool(iType)}
          </Button>
        )
      })}
    </Box>
  )
}
