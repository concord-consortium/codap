import { Box, Button, Menu, MenuButton } from "@chakra-ui/react"
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
  testId: string
  showMoreOptions: boolean
  onButtonClick?: () => void
}

export const InspectorButton = ({children, tooltip, testId, showMoreOptions, onButtonClick}:IInspectorButtonProps) => {
  return (
    <Button className="inspector-tool-button" title={tooltip} data-testid={testId}
      onClick={onButtonClick}>
      {children}
      {showMoreOptions && <MoreOptionsIcon className="more-options-icon"/>}
    </Button>
  )
}

interface IInspectorMenuProps {
  children: ReactNode
  icon: ReactNode
  tooltip: string
  testId: string
  onButtonClick?: () => void
  onOpen?: () => void
}
export const InspectorMenu = ({children, icon, tooltip, testId, onOpen, onButtonClick}:IInspectorMenuProps) => {
  return (
    <Menu isLazy onOpen={onOpen}>
      <MenuButton className="inspector-tool-button menu" title={tooltip} data-testid={testId}>
        {icon}
        <MoreOptionsIcon className="more-options-icon"/>
      </MenuButton>
      {children}
    </Menu>
  )
}

interface IInspectorPalette {
  children: ReactNode
  Icon?: ReactNode
  title?: string
  paletteTop?: number
  buttonLocation: number
}

export const InspectorPalette =({children, Icon, title, paletteTop, buttonLocation}:IInspectorPalette) => {

  const PalettePointer = () => {
    const pointerStyle = {top: (buttonLocation+11)}

    return (
      <div className={`palette-pointer arrow-left`} style={pointerStyle} />
    )
  }
  const PaletteHeader = () => {
    return (
      <div className="codap-inspector-palette-header" data-testid="codap-inspector-palette-header">
        <div className="codap-inspector-palette-icon-container">
          {Icon}
        </div>
        <div className="codap-inspector-palette-header-title">{title}</div>
      </div>
    )
  }
  const paletteStyle = {top: paletteTop}
  return(
    <Box className="codap-inspector-palette" style={paletteStyle}
        data-testid="codap-inspector-palette" tabIndex={0} zIndex={1400}>
      <PaletteHeader />
      {children}
      <PalettePointer/>
    </Box>
  )

}
