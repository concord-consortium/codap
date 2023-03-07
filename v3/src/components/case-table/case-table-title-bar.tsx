import React, { useRef, useState } from "react"
import { ComponentTitleBar } from "../component-title-bar"
import { Box, CloseButton, Flex, useOutsideClick } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import TableIcon from "../../assets/icons/icon-table.svg"
import CardIcon from "../../assets/icons/icon-case-card.svg"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

import "./case-table-title-bar.scss"

export const CaseTableTitleBar = ({tile, onCloseTile}: ITileTitleBarProps) => {
  const dataset = useDataSetContext()
  const title = dataset?.name || "Dataset"
  const [showSwitchMessage, setShowSwitchMessage] = useState(false)
  const [showCaseCard, setShowCaseCard] = useState(false)
  const cardTableToggleRef = useRef(null)
  const tileId = tile?.id || ""
  const tileType = tile?.content.type

  useOutsideClick({
    ref: cardTableToggleRef,
    handler: () => setShowSwitchMessage(false)
  })
  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
  }

  const handleShowCardTableToggleMessage = () => {
    setShowSwitchMessage(true)
  }

  const handleToggleCardTable = (e:React.MouseEvent) => {
    e.stopPropagation()
    setShowSwitchMessage(false)
    setShowCaseCard(!showCaseCard)
  }

  const cardTableToggleString = showCaseCard
                                  ? t("DG.DocumentController.toggleToCaseTable")
                                  : t("DG.DocumentController.toggleToCaseCard")

  return (
    <ComponentTitleBar component={"case-table"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <div className="header-left"
            title={cardTableToggleString}
            onClick={handleShowCardTableToggleMessage}>
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
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
            onClick={()=>onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
}
