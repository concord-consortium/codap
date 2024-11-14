import React, { useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import InformationIcon from "../../../assets/icons/icon-info.svg"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import TrashIcon from "../../../assets/icons/icon-trash.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import { DatasetInfoModal } from "./dataset-info-modal"
import { TrashMenuList } from "./trash-menu-list"
import { ICaseTileContentModel, isCaseTileContentModel } from "../case-tile-utils"
import { HideShowMenuList } from "../hide-show-menu-list"
import { t } from "../../../utilities/translation/translate"
import { RulerMenuList } from "./ruler-menu-list"
import { ITileInspectorPanelProps } from "../../tiles/tile-base-props"
import { useDataSet } from "../../../hooks/use-data-set"
import { DataSetContext } from "../../../hooks/use-data-set-context"
import { CaseMetadataContext } from "../../../hooks/use-case-metadata"
import { ICaseTableModel, isCaseTableModel } from "../../case-table/case-table-model"
import { findLongestContentWidth } from "../attribute-format-utils"

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

  const resizeAllColumns = () => {
    const kCellPadding = 10
    const newColumnWidths = new Map<string, number>()
    data?.collections.forEach((collection) => {
      collection.attributes.forEach((attr) => {
        if (attr) {
          const attrId = attr?.id
          const longestContentWidth = findLongestContentWidth(attr)
          newColumnWidths.set(attrId, Math.ceil(longestContentWidth + kCellPadding))
        }
      })
    })
    tableModel?.applyModelChange(() => {
      tableModel?.setColumnWidths(newColumnWidths)
    }, {
      log: {message: "Resize all columns", args:{}, category: "table"},
      undoStringKey: "DG.Undo.caseTable.resizeColumns",
      redoStringKey: "DG.Redo.caseTable.resizeColumns"
    })
  }

  return (
    <DataSetContext.Provider value={data}>
      <CaseMetadataContext.Provider value={metadata}>
        <InspectorPanel component="case-tile" show={show}>
          <InspectorButton tooltip={t("DG.Inspector.datasetInfo.toolTip")} showMoreOptions={true}
            onButtonClick={()=>handleButtonClick("datasetInfo")} testId="dataset-info-button">
            <InformationIcon />
          </InspectorButton>
          {showResizeColumnsButton &&
            <InspectorButton tooltip={t("DG.Inspector.resize.toolTip")} showMoreOptions={false}
              testId="resize-table-button" onButtonClick={resizeAllColumns}>
              <ScaleDataIcon />
            </InspectorButton>}
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
      </CaseMetadataContext.Provider>
    </DataSetContext.Provider>
  )
}
