import { forwardRef, Box, Button, Menu, MenuButton } from "@chakra-ui/react"
import { clsx } from "clsx"
import React, { ReactNode, RefObject, useEffect, useRef, useState } from "react"
import { useOutsidePointerDown } from "../hooks/use-outside-pointer-down"
import { isWithinBounds, getPaletteTopPosition } from "../utilities/view-utils"

import "./inspector-panel.scss"

interface IProps {
  component?: string
  show?: boolean
  children: ReactNode
  setShowPalette?: (palette: string | undefined) => void
  width?: "narrow" | "normal" | "wide"
}

export const InspectorPanel = forwardRef(({ component, show, setShowPalette, children, width }: IProps, ref) => {
  useOutsidePointerDown({
    ref: ref as unknown as RefObject<HTMLElement>,
    handler: ()=> setShowPalette?.(undefined),
    enabled: !!(show && ref && setShowPalette),
    info: {name: "InspectorPanel", component}
  })
  const classes = clsx("inspector-panel", component ?? "", width ?? "normal")
  return (show
    ? <Box ref={ref} className={classes} data-testid={"inspector-panel"}>
        {children}
      </Box>
    : null
  )
})

interface IInspectorButtonProps {
  bottom?: boolean
  children: ReactNode
  isDisabled?: boolean
  label?: string
  onButtonClick?: () => void
  setButtonRef?: (ref: any) => void
  testId: string
  tooltip: string
  top?: boolean
}

export const InspectorButton = ({
  bottom, children, isDisabled, label, onButtonClick, setButtonRef, testId, tooltip, top
}: IInspectorButtonProps) => {
  const buttonRef = useRef<any>()
  const _onClick = () => {
    setButtonRef?.(buttonRef)
    onButtonClick?.()
  }
  const className = clsx("inspector-tool-button", { bottom, top })
  return (
    <Button
      className={className}
      isDisabled={isDisabled}
      data-testid={testId}
      onClick={_onClick}
      ref={buttonRef}
      title={tooltip}
    >
      {children}
      {label && <span className="inspector-button-label">{label}</span>}
    </Button>
  )
}

interface IInspectorMenuProps {
  bottom?: boolean
  children: ReactNode
  icon: ReactNode
  label?: string
  onButtonClick?: () => void
  onOpen?: () => void
  testId: string
  tooltip: string
  top?: boolean
}

export const InspectorMenu = ({
  bottom, children, icon, label, onButtonClick, onOpen, testId, tooltip, top
}: IInspectorMenuProps) => {
  const classes = clsx("inspector-tool-button", "menu", { bottom, top })
  return (
    <Menu isLazy onOpen={onOpen}>
      <MenuButton className={classes} title={tooltip} data-testid={testId} onClick={onButtonClick}>
        {icon}
        {label && <span className="inspector-button-label">{label}</span>}
      </MenuButton>
      {children}
    </Menu>
  )
}

interface IInspectorPalette {
  children: ReactNode
  Icon?: ReactNode
  title?: string
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const InspectorPalette = ({children, Icon, title, panelRect, buttonRect,
     setShowPalette}:IInspectorPalette) => {
  const panelTop = panelRect?.top || 0
  const panelRight = panelRect?.right || 0
  const buttonTop = buttonRect?.top || 0
  const [paletteWidth, setPaletteWidth] = useState(0)
  const paletteRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<HTMLDivElement>(null)
  const viewportEl = paletteRef.current?.closest(".tile-row")
  const [inBounds, setInBounds] = useState(isWithinBounds(panelRight, paletteRef.current))
  const paletteHeight = paletteRef.current?.offsetHeight
  const tempPaletteTop = paletteRef.current?.getBoundingClientRect().top
  const pointerTop = buttonTop - panelTop - 5
  const pointerHeight = pointerRef.current?.offsetHeight
  const pointerMidpoint = pointerHeight ? pointerTop + pointerHeight/2 : 13
  const paletteTop = (tempPaletteTop && paletteHeight) &&
    getPaletteTopPosition(tempPaletteTop, paletteHeight, pointerMidpoint)

  useEffect(()=> {
    const observer = viewportEl && new ResizeObserver(entries => {
      entries.forEach(entry => {
        if (panelRight && paletteRef.current) {
          setInBounds(isWithinBounds(panelRight, paletteRef.current))
        }
      })
    })
    viewportEl && observer?.observe(viewportEl)
    return () => observer?.disconnect()
  }, [panelRight, viewportEl])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = e
    if (key === "Enter" || key === "Escape") {
      setShowPalette(undefined)
    }
  }

  useEffect(() => {
    if (paletteRef.current) {
      setPaletteWidth(paletteRef.current.offsetWidth)
      paletteRef.current.focus()
    }
  }, [])

  const PalettePointer = () => {
    const pointerStyle = {top: buttonTop - panelTop - 5}

    return (
      <div ref={pointerRef} className={`palette-pointer ${inBounds ? "arrow-left" : "arrow-right"}`}
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

  const paletteStyle = {top: paletteTop, left: inBounds ? 60 : -(paletteWidth + 10)}
  return (
    <>
      <PalettePointer/>
      <Box ref={paletteRef} className="codap-inspector-palette" style={paletteStyle} tabIndex={0} zIndex={250}
          data-testid="codap-inspector-palette" onKeyDown={handleKeyDown}>
        <PaletteHeader />
        {children}
      </Box>
    </>
  )
}
