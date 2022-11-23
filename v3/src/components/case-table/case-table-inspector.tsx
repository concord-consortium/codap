import React, { useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import HideShowIcon from "../../assets/icons/icon-hideShow.svg"
import InformationIcon from "../../assets/icons/icon-info.svg"
import ScaleDataIcon from "../../assets/icons/icon-scaleData.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { DatasetInfoModal } from "./inspector-panel/dataset-info-modal"

interface IProps {
  show: boolean
}

export const CaseTableInspector = ({ show }: IProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false)

  const handleButtonClick = (tool: string) => {
    switch (tool) {
      case "datasetInfo":
        setShowInfoModal(true)
    }
  }
  return (show
    ? <InspectorPanel>
        <InspectorButton icon={<InformationIcon />} type={"datasetInfo"}
          onButtonClick={()=>handleButtonClick("datasetInfo")} />
        <InspectorButton icon={<ScaleDataIcon />} type={"resize"} />
        <InspectorButton icon={<TrashIcon />} type={"delete"} />
        <InspectorButton icon={<HideShowIcon />} type={"hideShow"} />
        <InspectorButton icon={<ValuesIcon />} type={"attributes"} />
        {showInfoModal && <DatasetInfoModal showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}/>}
      </InspectorPanel>
    : null
  )
}

