import { Box, Button, Menu, MenuButton } from "@chakra-ui/react"
import React, { ReactNode, useEffect, useRef, useState } from "react"
import MoreOptionsIcon from "../assets/icons/arrow-moreIconOptions.svg"
import { isWithinBounds } from "../utilities/view-utils"

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
  button: string
}

export const InspectorPalette =({children, Icon, title, paletteTop = 0, button}:IInspectorPalette) => {
  const panelRect = document.querySelector("[data-testid=inspector-panel]")?.getBoundingClientRect()
  const buttonRect = document.querySelector(`[data-testid=${button}]`)?.getBoundingClientRect()
  const panelTop = panelRect?.top || 0
  const buttonTop = buttonRect?.top || 0
  const [paletteWidth, setPaletteWidth] = useState(0)
  useEffect(() => {
    if (paletteRef.current) {
      setPaletteWidth(paletteRef.current.offsetWidth)
    }
  }, [])

  const PalettePointer = () => {
    const pointerStyle = {top: buttonTop - panelTop - 5}

    return (
      <div className={`palette-pointer ${isWithinBounds(paletteWidth, buttonRect) ? "arrow-left" : "arrow-right"}`}
            style={pointerStyle} />
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
  const paletteStyle = {top: paletteTop, left: isWithinBounds(paletteWidth, buttonRect) ? 60 : -(paletteWidth + 10)}
  const paletteRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <PalettePointer/>
      <Box ref={paletteRef} className="codap-inspector-palette" style={paletteStyle} tabIndex={0} zIndex={250}
          data-testid="codap-inspector-palette">
        <PaletteHeader />
        {children}
      </Box>
    </>
  )

}
