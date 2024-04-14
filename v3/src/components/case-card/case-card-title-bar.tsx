import React, { useCallback, useRef, useState } from "react"
import { isCaseTableModel } from "./case-card-model"
import { ComponentTitleBar } from "../component-title-bar"
import { Box, useOutsideClick } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { t } from "../../utilities/translation/translate"
import { useDocumentContent } from "../../hooks/use-document-content"
import TableIcon from "../../assets/icons/icon-table.svg"
import CardIcon from "../../assets/icons/icon-case-card.svg"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

import "./case-table-title-bar.scss"

export const CaseCardTitleBar =
  observer(function CaseTableTitleBar({tile, onCloseTile, ...others}: ITileTitleBarProps) {
  const data = isCaseTableModel(tile?.content) ? tile?.content.data : undefined
  // case table title reflects DataSet title
  const getTitle = () => data?.title ?? ""
  const [showSwitchMessage, setShowSwitchMessage] = useState(false)
  const [showCaseCard, setShowCaseCard] = useState(false)
  const cardTableToggleRef = useRef(null)
  const documentContent = useDocumentContent()

  useOutsideClick({
    ref: cardTableToggleRef,
    handler: () => setShowSwitchMessage(false)
  })

  const handleShowCardTableToggleMessage = () => {
    setShowSwitchMessage(true)
  }

  const handleToggleCardTable = (e:React.MouseEvent) => {
    e.stopPropagation()
    setShowSwitchMessage(false)
    setShowCaseCard(!showCaseCard)
  }

  const handleChangeTitle = (newTitle?: string) => {
    if (newTitle) {
      // case table title reflects DataSet title
      data?.setTitle(newTitle)
    }
  }

  const closeCaseTable = useCallback(() => {
    documentContent?.applyUndoableAction(() => {
      documentContent?.toggleNonDestroyableTileVisibility(tile?.id)
    }, {
      undoStringKey: "V3.Undo.caseTable.hide",
      redoStringKey: "V3.Redo.caseTable.hide"
    })
  }, [documentContent, tile?.id])

  const cardTableToggleString = showCaseCard
                                  ? t("DG.DocumentController.toggleToCaseTable")
                                  : t("DG.DocumentController.toggleToCaseCard")

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others}
        onHandleTitleChange={handleChangeTitle} onCloseTile={closeCaseTable}>
      <div className="header-left"
            title={cardTableToggleString}
            onClick={handleShowCardTableToggleMessage}
            data-testid={"case-table-toggle-view"}>
        {showCaseCard
          ? <TableIcon className="table-icon" />
          : <CardIcon className="card-icon"/>
        }
        {showSwitchMessage &&
          <Box ref={cardTableToggleRef} className={`card-table-toggle-message`}
                onClick={handleToggleCardTable}>
            {cardTableToggleString}
          </Box>
        }
      </div>
    </ComponentTitleBar>
  )
})
