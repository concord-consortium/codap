import React, { ReactNode } from "react"
import { Button } from "@chakra-ui/react"
import { InspectorPanel } from "../inspector-panel"
import HideShowIcon from "../../assets/icons/icon-hideShow.svg"
import InformationIcon from "../../assets/icons/icon-info.svg"
import ScaleDataIcon from "../../assets/icons/icon-scaleData.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import MoreOptionsIcon from "../../assets/icons/arrow-moreIconOptions.svg"

interface IProps {
  show: boolean
}

const ToolIconMap: Record<string, ReactNode> = {
  "information": <InformationIcon />,
  "resize": <ScaleDataIcon />,
  "trash": <TrashIcon />,
  "hide_show": <HideShowIcon />,
  "values": <ValuesIcon />
}

export const CaseTableInspector = ({ show }: IProps) => {
  return (show
    ? <InspectorPanel>
        <InspectorButton type={"information"} />
        <InspectorButton type={"resize"} />
        <InspectorButton type={"trash"} />
        <InspectorButton type={"hide_show"} />
        <InspectorButton type={"values"} />
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
