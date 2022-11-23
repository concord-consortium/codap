import React from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
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
    ? <InspectorPanel>
        <InspectorButton icon={<InformationIcon />} type={"datasetInfo"} />
        <InspectorButton icon={<ScaleDataIcon />} type={"resize"} />
        <InspectorButton icon={<TrashIcon />} type={"delete"} />
        <InspectorButton icon={<HideShowIcon />} type={"hideShow"} />
        <InspectorButton icon={<ValuesIcon />} type={"attributes"} />
      </InspectorPanel>
    : null
  )
}

// const [showInfoModal, setShowInfoModal] = useState(false)

// const handleToolClick = (tool: string) => {
//   switch (tool) {
//     case "datasetInfo":
//       setShowInfoModal(true)
//   }
// }
