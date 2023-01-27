import React, { useState } from "react"
import { CloseButton, Flex } from "@chakra-ui/react"
import { EditableComponentTitle } from "./editable-component-title"
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
  const [showCaseCard, setShowCaseCard] = useState(false)

  const handleTitleChange = (title?: string) => {
    title && setComponentTitle(title)
  }

  return (
    <Flex className="component-title-bar">
      {tileType === "codap-case-table" &&
        <Flex className="header-left">
          {showCaseCard
            ? <TableIcon className="card-table-icon"/>
            : <CardIcon className="card-table-icon"/>
          }
        </Flex>
      }
      <EditableComponentTitle componentTitle={componentTitle} onEndEdit={handleTitleChange} />
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon"/>
        <CloseButton className="component-close-button"/>
      </Flex>
    </Flex>

  )
}
