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
import { t } from "../../utilities/translation/translate"
import { RulerMenuList } from "./inspector-panel/ruler-menu-list"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { ICaseTableModel, isCaseTableModel } from "./case-table-model"
import { useDataSet } from "../../hooks/use-data-set"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { CaseMetadataContext } from "../../hooks/use-case-metadata"
import { CaseTableModelContext } from "./use-case-table-model"
import "./case-table-inspector.scss"
import { logStringifiedObjectMessage } from "../../lib/log-message"

export const CaseTableInspector = ({ tile, show }: ITileInspectorPanelProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false)
  const tableModel: ICaseTableModel | undefined = isCaseTableModel(tile?.content) ? tile?.content : undefined
  const { data, metadata } = useDataSet(tableModel?.data, tableModel?.metadata)

  if (!tableModel) return null

  const handleButtonClick = (tool: string) => {
    switch (tool) {
      case "datasetInfo":
        setShowInfoModal(true)
        break
      case "resizeColumns":
        //TODO move log to respective handler
        tableModel?.applyModelChange(() => {}, {
          log: logStringifiedObjectMessage("resizeColumns", {dataContext: data?.name})
        })
        break
    }
  }

  return (
    <DataSetContext.Provider value={data}>
      <CaseMetadataContext.Provider value={metadata}>
        <CaseTableModelContext.Provider value={tableModel}>
          <InspectorPanel component="table" show={show}>
            <InspectorButton tooltip={t("DG.Inspector.datasetInfo.toolTip")} showMoreOptions={true}
              onButtonClick={()=>handleButtonClick("datasetInfo")} testId="dataset-info-button">
              <InformationIcon />
            </InspectorButton>
            <InspectorButton tooltip={t("DG.Inspector.resize.toolTip")} showMoreOptions={false}
              testId="resize-table-button" onButtonClick={()=>handleButtonClick("resizeColumns")}>
              <ScaleDataIcon />
            </InspectorButton>
            <InspectorMenu tooltip={t("DG.Inspector.delete.toolTip")}
              icon={<TrashIcon className="inspector-menu-icon trash-icon"/>}
              testId="delete-cases-button">
              <TrashMenuList />
            </InspectorMenu>
            <InspectorMenu tooltip={t("DG.Inspector.hideShow.toolTip")}
                icon={<HideShowIcon />} testId="hide-show-button">
              <HideShowMenuList />
            </InspectorMenu>
            <InspectorMenu tooltip={t("DG.Inspector.attributes.toolTip")}
              icon={<ValuesIcon className="inspector-menu-icon"/>} testId="ruler-button">
              <RulerMenuList />
            </InspectorMenu>
            {showInfoModal && <DatasetInfoModal showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}/>}
          </InspectorPanel>
        </CaseTableModelContext.Provider>
      </CaseMetadataContext.Provider>
    </DataSetContext.Provider>
  )
}
