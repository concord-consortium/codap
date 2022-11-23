import { Box, Button } from "@chakra-ui/react"
import React, { ReactNode } from "react"
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
  children: ReactNode
  tooltip: string
  showMoreOptions: boolean
  onButtonClick?: () => void
}

export const InspectorButton = ({children, tooltip, showMoreOptions, onButtonClick}:IInspectorButtonProps) => {
  return (
    <Button className="inspector-tool-button" title={tooltip}
      onClick={onButtonClick}>
      {children}
      {showMoreOptions && <MoreOptionsIcon className="more-options-icon"/>}
    </Button>
  )
}

