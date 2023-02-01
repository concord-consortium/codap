import React, { useState } from "react"
import { ComponentTitleBar, EditableComponentTitle  } from "../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"

export const CalculatorTitleBar = () => {
  const [title, setTitle] = useState("Calculator")

  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
  }

  return (
    <ComponentTitleBar component={"data-summary"}>
      <EditableComponentTitle componentTitle={title} onEndEdit={handleTitleChange} />
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}/>
      </Flex>
    </ComponentTitleBar>
  )
}
