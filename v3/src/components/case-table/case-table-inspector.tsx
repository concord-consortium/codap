import React from "react"
import { InspectorPanel } from "../inspector-panel"
import HideShowIcon from "../../assets/icons/icon-hideShow.svg"
import InformationIcon from "../../assets/icons/icon-info.svg"
import ScaleDataIcon from "../../assets/icons/icon-scaleData.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import ValuesIcon from "../../assets/icons/icon-values.svg"

interface IProps {
  show: boolean
}

export const CaseTableInspector = ({ show }: IProps) => {
  return (show
    ? <InspectorPanel component="case-table">
        <InformationIcon />
        <ScaleDataIcon />
        <TrashIcon />
        <HideShowIcon />
        <ValuesIcon />
      </InspectorPanel>
    : null
  )
}
