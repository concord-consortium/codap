import { Box, Button } from "@chakra-ui/react"
import React from "react"
import InformationIcon from "../assets/icons/icon-info.svg"
import LayersIcon from "../assets/icons/icon-layers.svg"
import ScaleDataIcon from "../assets/icons/icon-scaleData.svg"
import BarChartIcon from "../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../assets/icons/icon-styles.svg"
import TrashIcon from "../assets/icons/icon-trash.svg"
import ValuesIcon from "../assets/icons/icon-values.svg"

import "./inspector-panel.scss"

interface IProps {
  component: string
}

const InspectorIconComponent: Record<string, any> = {
  "information": InformationIcon,
  "layers": LayersIcon,
  "resize": ScaleDataIcon,
  "bar_chart": BarChartIcon,
  "styles": StylesIcon,
  "trash": TrashIcon,
  "values": ValuesIcon
}

const InspectorTool = (tool: string) => {
  const IconComponent = InspectorIconComponent[tool]
  return (
    <IconComponent />
  )
}

export const InspectorPanel = ({component}: IProps) => {
  const tableInpectors = ["information", "resize", "trash", "eye", "values"]
  const graphInspectors = ["resize", "eye", "values", "bar_chart", "styles", "snapshot"]
  const mapInspectors = ["resize", "eye", "values", "layers", "snapshot"]
  const sliderInspectors = ["values"]

  return (
    <Box className="inspector-panel" w="50px" bg="tealDark" data-testid={`inspector-panel-${component}`}>
      <Button className="inspector-tool-button" bg="tealDark" outlineColor="tealDark">
        <InformationIcon />
      </Button>
      <Button className="inspector-tool-button" bg="tealDark">
        <LayersIcon />
      </Button>
      <Button className="inspector-tool-button" bg="tealDark">
        <ScaleDataIcon />
      </Button>
      <Button className="inspector-tool-button" bg="tealDark">
        <BarChartIcon />
      </Button>
      <Button className="inspector-tool-button" bg="tealDark">
        <TrashIcon />
      </Button>
      {/* <Button className="inspector-tool-button" bg="tealDark">
        <StylesIcon />
      </Button>
      <Button className="inspector-tool-button" bg="tealDark">
        <ValuesIcon />
      </Button> */}
    </Box>
  )
}
