import React, { useState } from "react"
import { Box, CloseButton, Flex } from "@chakra-ui/react"
import { EditableComponentTitle } from "./editable-component-title"
import t from "../utilities/translation/translate"
import MinimizeIcon from "../assets/icons/icon-minimize.svg"
import TableIcon from "../assets/icons/icon-table.svg"
import CardIcon from "../assets/icons/icon-case-card.svg"

import "./component-title-bar.scss"

interface IProps {
  tileType: string
  datasetName?: string
}

export const ComponentTitleBar = ({tileType, datasetName}: IProps) => {
  const [componentTitle, setComponentTitle] = useState(datasetName || "New Dataset")
  const [showSwitchMessage, setShowSwitchMessage] = useState(false)
  const [showCaseCard, setShowCaseCard] = useState(false)

  const handleTitleChange = (title?: string) => {
    title && setComponentTitle(title)
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
    <Flex className="component-title-bar">
      {tileType === "codap-case-table" &&
        <div className="header-left"
             title={cardTableToggleString}
             onClick={handleShowCardTableToggleMessage}>
          {showCaseCard
            ? <TableIcon className="table-icon" />
            : <CardIcon className="card-icon"/>
          }
          {showSwitchMessage &&
            <Box className={`card-table-toggle-message`}
                  onClick={handleToggleCardTable}>
              {cardTableToggleString}
            </Box>
          }
        </div>
      }
      <EditableComponentTitle componentTitle={componentTitle} onEndEdit={handleTitleChange} />
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon"/>
        <CloseButton className="component-close-button"/>
      </Flex>
    </Flex>

  )
}
