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
import { RulerMenuList } from "./inspector-panel/ruler-menu-list"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"


export const CaseTableInspector = ({ show }: ITileInspectorPanelProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false)
  const handleButtonClick = (tool: string) => {
    switch (tool) {
      case "datasetInfo":
        setShowInfoModal(true)
    }
  }

  return (
    <InspectorPanel component="table" show={show}>
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
          icon={<HideShowIcon />} testId="hide-show-button">
        <HideShowMenuList />
      </InspectorMenu>
      <InspectorMenu tooltip={t("DG.Inspector.attributes.toolTip")}
        icon={<ValuesIcon className="inspector-menu-icon"/>} testId="table-attributes-button">
        <RulerMenuList />
      </InspectorMenu>
      {showInfoModal && <DatasetInfoModal showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}/>}
    </InspectorPanel>
  )
}
