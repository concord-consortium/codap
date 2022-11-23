import React, { useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../inspector-panel"
import HideShowIcon from "../../assets/icons/icon-hideShow.svg"
import InformationIcon from "../../assets/icons/icon-info.svg"
import ScaleDataIcon from "../../assets/icons/icon-scaleData.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { DatasetInfoModal } from "./inspector-panel/dataset-info-modal"
import { TrashMenuList } from "./inspector-panel/trash-menu-list"
import { HideShowMenuList } from "./inspector-panel/hide-show-menu-list"
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
          onButtonClick={()=>handleButtonClick("datasetInfo")} testId="dataset-info-button">
          <InformationIcon />
        </InspectorButton>
        <InspectorButton tooltip={t("DG.Inspector.resize.toolTip")} showMoreOptions={false}
          testId="resize-table-button">
          <ScaleDataIcon />
        </InspectorButton>
        <InspectorMenu tooltip={t("DG.Inspector.delete.toolTip")} icon={<TrashIcon className="inspector-menu-icon"/>}
          testId="delete-cases-button">
          <TrashMenuList />
        </InspectorMenu>
        <InspectorMenu tooltip={t("DG.Inspector.hideShow.toolTip")}
            icon={<HideShowIcon className="inspector-menu-icon"/>} testId="hide-show-button">
          <HideShowMenuList />
        </InspectorMenu>
        <InspectorButton tooltip={t("DG.Inspector.attributes.toolTip")} showMoreOptions={true}
          testId="table-attributes-button">
          <ValuesIcon />
        </InspectorButton>
        {showInfoModal && <DatasetInfoModal showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}/>}
      </InspectorPanel>
    : null
  )
}
