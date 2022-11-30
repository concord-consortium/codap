import { Box, Button, Menu, MenuButton } from "@chakra-ui/react"
import React, { ReactNode, useEffect, useRef, useState } from "react"
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
}
export const InspectorMenu = ({children, icon, tooltip, testId, onButtonClick}:IInspectorMenuProps) => {
  return (
    <Menu isLazy>
      <MenuButton className="inspector-tool-button menu" title={tooltip} data-testid={testId}>
        {icon}
        <MoreOptionsIcon className="more-options-icon"/>
      </MenuButton>
      {children}
    </Menu>
  )
}

interface IInspectorPallete {
  children: ReactNode
  Icon?: ReactNode
  title?: string
  showPalette: boolean
  paletteTop?: number
  onPaletteBlur: () => void
}

export const InspectorPalette =({children, Icon, title, showPalette, paletteTop, onPaletteBlur}:IInspectorPallete) => {
  const paletteRef = useRef(null)
  const [paletteHeight, setPaletteHeight] = useState(251)
  // const [paletteTop, setPaletteTop] = useState(0)
  useEffect(() => {
    if (showPalette) {
      // console.log(paletteRef.current.clientHeight)
    }
    // paletteRef.current && setPaletteHeight(paletteRef.current.clientHeight)
  })
  console.log("palHeight", paletteHeight)
  const PalettePointer = () => {
    // const pointerStyle = {top: (paletteHeight/2)+11}
    const pointerStyle = {top: "160px", zIndex: 50}

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
    <div className="codap-inspector-palette" style={paletteStyle} ref={paletteRef}
      data-testid="codap-inspector-palette" onBlur={onPaletteBlur}>
      <Box className="inspector-palette-content">
        <PaletteHeader />
        {children}
      </Box>
      <PalettePointer/>
    </div>
  )

}
