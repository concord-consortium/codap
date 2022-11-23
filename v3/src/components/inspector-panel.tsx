import { Box, Button } from "@chakra-ui/react"
import React, { ReactNode } from "react"
import t from "../utilities/translation/translate"
import MoreOptionsIcon from "../assets/icons/arrow-moreIconOptions.svg"

import "./inspector-panel.scss"

interface IProps {
  component?: string
  children: ReactNode
}

export const InspectorPanel = ({ component, children }: IProps) => {
  return (
    <Box className={`inspector-panel ${component ?? "" }`} bg="tealDark" data-testid={"inspector-panel"}>
      {children}
    </Box>
  )
}

interface IInspectorButtonProps {
  icon: ReactNode
  type: string
  onButtonClick?: () => void
}

export const InspectorButton = ({icon, type, onButtonClick}:IInspectorButtonProps) => {
  return (
    <Button className="inspector-tool-button" title={t(`DG.Inspector.${type}.toolTip`)}
      onClick={onButtonClick}>
      {icon}
      {(type !== "resize") && <MoreOptionsIcon className="more-options-icon"/>}
    </Button>
  )
}

{/* <Button key={iType} className="inspector-tool-button" bg="tealDark"
title={t(`DG.Inspector.${iType}.toolTip`)} onClick={()=> handleToolClick(iType)}>
{InspectorTool(iType)}
{!(iType === "resize") &&
  <MoreOptionsIcon className="more-options-icon"/>
}
</Button> */}
