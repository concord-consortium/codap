import { useState } from "react"
import { useDataSet } from "../../../hooks/use-data-set"
import { DataSetContext } from "../../../hooks/use-data-set-context"
import { DataSetMetadataContext } from "../../../hooks/use-data-set-metadata"
import { t } from "../../../utilities/translation/translate"
import { ICaseTableModel, isCaseTableModel } from "../../case-table/case-table-model"
import { resizeAllColumns } from "../../case-table/case-table-utils"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import { ITileInspectorPanelProps } from "../../tiles/tile-base-props"
import { ICaseTileContentModel, isCaseTileContentModel } from "../case-tile-utils"
import { HideShowMenuList } from "../hide-show-menu-list"
import { DatasetInfoModal } from "./dataset-info-modal"
import { RulerMenuList } from "./ruler-menu-list"
import { TrashMenuList } from "./trash-menu-list"

import HideShowIcon from "../../../assets/icons/inspector-panel/view-icon.svg"
import InformationIcon from "../../../assets/icons/inspector-panel/info-icon.svg"
import ScaleDataIcon from "../../../assets/icons/inspector-panel/resize-icon.svg"
import TrashIcon from "../../../assets/icons/inspector-panel/delete-icon.svg"
import ValuesIcon from "../../../assets/icons/inspector-panel/data-icon.svg"

import "./case-tile-inspector.scss"

interface IProps extends ITileInspectorPanelProps {
  showResizeColumnsButton?: boolean
}

export const CaseTileInspector = ({ tile, show, showResizeColumnsButton }: IProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false)
  const caseTileModel: Maybe<ICaseTileContentModel> =
    isCaseTileContentModel(tile?.content) ? tile?.content : undefined
  const { data, metadata } = useDataSet(caseTileModel?.data, caseTileModel?.metadata)
  const tableModel: ICaseTableModel | undefined = isCaseTableModel(tile?.content) ? tile?.content : undefined
  if (!caseTileModel) return null

  const handleButtonClick = (tool: string) => {
    switch (tool) {
      case "datasetInfo":
        setShowInfoModal(true)
        break
    }
  }

  const handleResizeAllColumns = () => {
    if (!tableModel) return
    tableModel.applyModelChange(() => {
      resizeAllColumns(tableModel)
    }, {
      log: {message: "Resize all columns", args:{}, category: "table"},
      undoStringKey: "DG.Undo.caseTable.resizeColumns",
      redoStringKey: "DG.Redo.caseTable.resizeColumns"
    })
  }

  return (
    <DataSetContext.Provider value={data}>
      <DataSetMetadataContext.Provider value={metadata}>
        <InspectorPanel component="case-tile" show={show} width="narrow">
          <InspectorButton
            onButtonClick={()=>handleButtonClick("datasetInfo")}
            label={t("V3.CaseCardTable.Inspector.Info")}
            testId="dataset-info-button"
            tooltip={t("DG.Inspector.datasetInfo.toolTip")}
            top={true}
          >
            <InformationIcon />
          </InspectorButton>
          {showResizeColumnsButton &&
            <InspectorButton
              label={t("V3.CaseCardTable.Inspector.Resize")}
              onButtonClick={handleResizeAllColumns}
              testId="resize-table-button"
              tooltip={t("DG.Inspector.resize.toolTip")}
            >
              <ScaleDataIcon />
            </InspectorButton>
          }
          <InspectorMenu
            icon={<HideShowIcon />}
            label={t("V3.CaseCardTable.Inspector.View")}
            testId="hide-show-button"
            tooltip={t("DG.Inspector.hideShow.toolTip")}
          >
            <HideShowMenuList />
          </InspectorMenu>
          <InspectorMenu
            icon={<ValuesIcon className="inspector-menu-icon"/>}
            label={t("V3.CaseCardTable.Inspector.Data")}
            testId="ruler-button"
            tooltip={t("DG.Inspector.attributes.toolTip")}
          >
            <RulerMenuList />
          </InspectorMenu>
          <InspectorMenu
            bottom={true}
            icon={<TrashIcon />}
            label={t("V3.CaseCardTable.Inspector.Delete")}
            testId="delete-cases-button"
            tooltip={t("DG.Inspector.delete.toolTip")}
          >
            <TrashMenuList />
          </InspectorMenu>
          {showInfoModal && <DatasetInfoModal showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}/>}
        </InspectorPanel>
      </DataSetMetadataContext.Provider>
    </DataSetContext.Provider>
  )
}
