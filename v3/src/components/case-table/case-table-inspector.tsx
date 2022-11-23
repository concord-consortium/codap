import React, { useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../inspector-panel"
import HideShowIcon from "../../assets/icons/icon-hideShow.svg"
import InformationIcon from "../../assets/icons/icon-info.svg"
import ScaleDataIcon from "../../assets/icons/icon-scaleData.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { DatasetInfoModal } from "./inspector-panel/dataset-info-modal"
import { TrashMenuList } from "./inspector-panel/trash-menu-list"
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
        <InspectorButton tooltip={t("DG.Inspector.datasetInfo.toolTip")} showMoreOptions={true}
          onButtonClick={()=>handleButtonClick("datasetInfo")}>
          <InformationIcon />
        </InspectorButton>
        <InspectorButton tooltip={t("DG.Inspector.resize.toolTip")} showMoreOptions={false}>
          <ScaleDataIcon />
        </InspectorButton>
        <InspectorMenu tooltip={"DG.Inspector.delete.toolTip"} icon={<TrashIcon className="inspector-menu-icon"/>}>
          <TrashMenuList />
        </InspectorMenu>
        <InspectorButton tooltip={"DG.Inspector.hideShow.toolTip"} showMoreOptions={true}>
          <HideShowIcon />
        </InspectorButton>
        <InspectorButton tooltip={"DG.Inspector.attributes.toolTip"} showMoreOptions={true}>
          <ValuesIcon />
        </InspectorButton>
        {showInfoModal && <DatasetInfoModal showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}/>}
      </InspectorPanel>
    : null
  )
}
