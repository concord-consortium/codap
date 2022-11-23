import React, { useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import HideShowIcon from "../../assets/icons/icon-hideShow.svg"
import InformationIcon from "../../assets/icons/icon-info.svg"
import ScaleDataIcon from "../../assets/icons/icon-scaleData.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { DatasetInfoModal } from "./inspector-panel/dataset-info-modal"
import t from "../../utilities/translation/translate"

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
        <InspectorButton
          icon={<InformationIcon />}
          tooltip={t("DG.Inspector.datasetInfo.toolTip")}
          showMoreOptions={true}
          onButtonClick={()=>handleButtonClick("datasetInfo")}
        />
        <InspectorButton
          icon={<ScaleDataIcon />}
          tooltip={t("DG.Inspector.resize.toolTip")}
          showMoreOptions={false}
        />
        <InspectorButton
          icon={<TrashIcon />}
          tooltip={"DG.Inspector.delete.toolTip"}
          showMoreOptions={true}
        />
        <InspectorButton
          icon={<HideShowIcon />}
          tooltip={"DG.Inspector.hideShow.toolTip"}
          showMoreOptions={true}
        />
        <InspectorButton
          icon={<ValuesIcon />}
          tooltip={"DG.Inspector.attributes.toolTip"}
          showMoreOptions={true}
        />
        {showInfoModal && <DatasetInfoModal showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}/>}
      </InspectorPanel>
    : null
  )
}

