import { Box, useOutsideClick } from "@chakra-ui/react"
import React, { SVGProps, useCallback, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import CardIcon from "../../assets/icons/icon-case-card.svg"
import TableIcon from "../../assets/icons/icon-table.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { updateDataContextNotification } from "../../models/data/data-set-notifications"
import { getTileDataSet } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { kCaseCardTileType } from "../case-card/case-card-defs"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import { ComponentTitleBar } from "../component-title-bar"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

import "./case-table-card-title-bar.scss"

interface TableCardInfo {
  thisType: typeof kCaseCardTileType | typeof kCaseTableTileType
  otherType: typeof kCaseCardTileType | typeof kCaseTableTileType
  thisSuffix: string
  otherSuffix: string
  toggleSuffix: string
  Icon: React.FC<SVGProps<SVGSVGElement>>
  iconClass: string
}

const tileInfoMap: Record<string, TableCardInfo> = {
  [kCaseCardTileType]: {
    thisType: kCaseCardTileType,
    otherType: kCaseTableTileType,
    thisSuffix: "Card",
    otherSuffix: "Table",
    toggleSuffix: "CardToTable",
    Icon: CardIcon,
    iconClass: "card-icon"
  },
  [kCaseTableTileType]: {
    thisType: kCaseTableTileType,
    otherType: kCaseCardTileType,
    thisSuffix: "Table",
    otherSuffix: "Card",
    toggleSuffix: "TableToCard",
    Icon: TableIcon,
    iconClass: "table-icon"
  }
}

function getTileInfo(tileType?: string) {
  return (tileType ? tileInfoMap[tileType] : null) ?? tileInfoMap[kCaseTableTileType]
}

export const CaseTableCardTitleBar =
  observer(function CaseTableTitleBar({tile, onCloseTile, ...others}: ITileTitleBarProps) {
    const tileInfo = getTileInfo(tile?.content.type)
    const data = tile?.content && getTileDataSet(tile?.content)
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
      const suffix = tileInfo.toggleSuffix
      e.stopPropagation()
      documentContent?.applyModelChange(() => {
        tile && documentContent?.toggleCardTable(tile.id)
      }, {
        undoStringKey: `DG.Undo.component.toggle${suffix}`,
        redoStringKey: `DG.Redo.component.toggle${suffix}`
      })
    }

    const handleChangeTitle = (newTitle?: string) => {
      if (newTitle) {
        // case table title reflects DataSet title
        data?.applyModelChange(() => {
          data.setTitle(newTitle)
        }, {
          notifications: () => updateDataContextNotification(data),
          undoStringKey: "DG.Undo.component.componentTitleChange",
          redoStringKey: "DG.Redo.component.componentTitleChange"
        })
      }
    }

    const closeCaseTableOrCard = useCallback(() => {
      const suffix = tileInfo.thisSuffix
      documentContent?.applyModelChange(() => {
        documentContent?.toggleNonDestroyableTileVisibility(tile?.id)
      }, {
        undoStringKey: `V3.Undo.case${suffix}.hide`,
        redoStringKey: `V3.Redo.case${suffix}.hide`
      })
    }, [documentContent, tile?.id, tileInfo])

    const caseTableOrCardToggleString =
      t(`DG.DocumentController.toggleToCase${tileInfo.otherSuffix}`)
    const CardOrTableIcon = tileInfo.Icon
    const cardOrTableIconClass = tileInfo.iconClass

    return (
      <ComponentTitleBar tile={tile} getTitle={getTitle} {...others}
                         onHandleTitleChange={handleChangeTitle} onCloseTile={closeCaseTableOrCard}>
        <div className="header-left"
             title={caseTableOrCardToggleString}
             onClick={handleShowCardTableToggleMessage}
             data-testid={"case-table-toggle-view"}>
          <CardOrTableIcon className={`${cardOrTableIconClass}`}/>
          {showSwitchMessage &&
             <Box ref={cardTableToggleRef} className={`card-table-toggle-message`}
                  onClick={handleToggleCardTable}>
               {caseTableOrCardToggleString}
             </Box>
          }
        </div>
      </ComponentTitleBar>
    )
  })
