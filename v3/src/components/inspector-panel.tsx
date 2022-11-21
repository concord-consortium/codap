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
import MoreOptionsIcon from "../assets/icons/arrow-moreIconOptions.svg"

import "./inspector-panel.scss"

interface IProps {
  tools: string[]
  component?: string
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

export const InspectorPanel = ({tools, component}: IProps) => {
  return (
    <Box className={`inspector-panel ${component ? component : "" }`} bg="tealDark" data-testid={"inspector-panel"}>
      {tools.map((iType: string) => {
        return (
          <Button key={iType} className="inspector-tool-button" bg="tealDark">
            {InspectorTool(iType)}
            {!(iType === "resize") &&
              <MoreOptionsIcon className="more-options-icon"/>
            }
          </Button>
        )
      })}
    </Box>
  )
}
