import React, { useCallback, useRef, useState } from "react"
import { ComponentTitleBar } from "../component-title-bar"
import { Box, useOutsideClick } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { t } from "../../utilities/translation/translate"
import { useDocumentContent } from "../../hooks/use-document-content"
import CardIcon from "../../assets/icons/icon-case-card.svg"
import TableIcon from "../../assets/icons/icon-table.svg"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import { isCaseTableModel } from "../case-table/case-table-model"
import { isCaseCardModel } from "../case-card/case-card-model"

import "./case-table-card-title-bar.scss"

export const CaseTableCardTitleBar =
  observer(function CaseTableTitleBar({tile, onCloseTile, ...others}: ITileTitleBarProps) {
    const type = tile?.content.type as "CaseTable" | "CaseCard"
    const data = (isCaseTableModel(tile?.content) || isCaseCardModel(tile?.content))
      ? tile.content.data : undefined
    // title reflects DataSet title
    const getTitle = () => data?.title ?? ""
    const [showSwitchMessage, setShowSwitchMessage] = useState(false)
    const cardTableToggleRef = useRef(null)
    const documentContent = useDocumentContent()

    useOutsideClick({
      ref: cardTableToggleRef,
      handler: () => setShowSwitchMessage(false)
    })

    const handleShowCardTableToggleMessage = () => {
      setShowSwitchMessage(true)
    }

    const handleToggleCardTable = (e: React.MouseEvent) => {
      const suffix = type === kCaseTableTileType ? "TableToCard" : "CardToTable"
      e.stopPropagation()
      documentContent?.applyUndoableAction(() => {
        tile && documentContent?.toggleCardTable(tile.id, type)
      }, {
        undoStringKey: `DG.Undo.component.toggle${suffix}`,
        redoStringKey: `DG.Redo.component.toggle${suffix}`
      })
    }

    const handleChangeTitle = (newTitle?: string) => {
      if (newTitle) {
        // case table title reflects DataSet title
        data?.setTitle(newTitle)
      }
    }

    const closeCaseTableOrCard = useCallback(() => {
      const suffix = type === kCaseTableTileType ? "Table" : "Card"
      documentContent?.applyUndoableAction(() => {
        documentContent?.toggleNonDestroyableTileVisibility(tile?.id)
      }, {
        undoStringKey: `V3.Undo.case${suffix}.hide`,
        redoStringKey: `V3.Redo.case${suffix}.hide`
      })
    }, [documentContent, tile?.id, type])

    const cardTableOrCardToggleString =
      t(`DG.DocumentController.toggleToCase${type===kCaseTableTileType?'Card':'Table'}`)

    return (
      <ComponentTitleBar tile={tile} getTitle={getTitle} {...others}
                         onHandleTitleChange={handleChangeTitle} onCloseTile={closeCaseTableOrCard}>
        <div className="header-left"
             title={cardTableOrCardToggleString}
             onClick={handleShowCardTableToggleMessage}
             data-testid={"case-table-toggle-view"}>
          {type === kCaseTableTileType ? <CardIcon className="card-icon"/> : <TableIcon className = "table-icon"/>}
          {showSwitchMessage &&
             <Box ref={cardTableToggleRef} className={`card-table-toggle-message`}
                  onClick={handleToggleCardTable}>
               {cardTableOrCardToggleString}
             </Box>
          }
        </div>
      </ComponentTitleBar>
    )
  })
