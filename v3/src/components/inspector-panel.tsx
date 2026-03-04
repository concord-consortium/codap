import { forwardRef, Box, Button, Menu, MenuButton } from "@chakra-ui/react"
import { clsx } from "clsx"
import React, { ReactNode, RefObject, useEffect, useRef, useState } from "react"
import { useOutsidePointerDown } from "../hooks/use-outside-pointer-down"
import { isWithinBounds, getPaletteTopPosition } from "../utilities/view-utils"

import "./inspector-panel.scss"

// Returns an aria-label for icon-only inspector buttons/menus.
// When a visible text label exists, returns undefined (the label provides the accessible name).
// When no label exists, returns the tooltip with parenthetical keyboard shortcuts stripped
// (e.g. "bold (⌘-b)" → "bold") so screen readers announce a clean name.
function ariaLabel(label?: string, tooltip?: string) {
  if (label) return undefined
  return tooltip?.replace(/\s*\(.*\)$/, "")
}

interface IProps {
  component?: string
  show?: boolean
  children: ReactNode
  setShowPalette?: (palette: string | undefined) => void
  width?: "very-narrow" | "narrow" | "normal" | "wide"
}

export const InspectorPanel = forwardRef(({ component, show, setShowPalette, children, width }: IProps, ref) => {
  useOutsidePointerDown({
    ref: ref as unknown as RefObject<HTMLElement>,
    handler: ()=> setShowPalette?.(undefined),
    enabled: !!(show && ref && setShowPalette),
    info: {name: "InspectorPanel", component}
  })
  const classes = clsx("inspector-panel", component, width ?? "normal")
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
  isActive?: boolean
  isDisabled?: boolean
  label?: string
  onButtonClick?: (e: React.MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  testId: string
  tooltip: string
  top?: boolean
}

export const InspectorButton = forwardRef(function InspectorButton({
  bottom, children, isActive, isDisabled, label, onButtonClick, onPointerDown, testId, tooltip, top
}: IInspectorButtonProps, ref) {
  const className = clsx("inspector-tool-button", { active: isActive, bottom, top })
  return (
    <Button
      aria-label={ariaLabel(label, tooltip)}
      className={className}
      isDisabled={isDisabled}
      data-testid={testId}
      onClick={onButtonClick}
      onPointerDown={!isDisabled ? onPointerDown : undefined}
      ref={ref}
      title={tooltip}
    >
      {children}
      {label && <span className="inspector-button-label">{label}</span>}
    </Button>
  )
})

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
  const classes = clsx("inspector-tool-button", "inspector-tool-menu", { bottom, top })
  return (
    <Menu isLazy onOpen={onOpen}>
      <MenuButton aria-label={ariaLabel(label, tooltip)} className={classes} title={tooltip} data-testid={testId}
          onClick={onButtonClick}>
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
  const pointerSize = 10
  const panelTop = panelRect?.top || 0
  const panelRight = panelRect?.right || 0
  const buttonTop = buttonRect?.top || 0
  const buttonHeight = buttonRect?.height || 52
  const [paletteWidth, setPaletteWidth] = useState(0)
  const paletteRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<HTMLDivElement>(null)
  const viewportEl = paletteRef.current?.closest(".tile-row")
  const [inBounds, setInBounds] = useState(() => isWithinBounds(panelRight, paletteRef.current))
  const paletteHeight = paletteRef.current?.offsetHeight
  const tempPaletteTop = paletteRef.current?.getBoundingClientRect().top
  const pointerTop = buttonTop - panelTop + buttonHeight / 2 - pointerSize
  const pointerMidpoint = pointerTop + pointerSize
  const paletteTop = (tempPaletteTop && paletteHeight) &&
    getPaletteTopPosition(tempPaletteTop, paletteHeight, pointerMidpoint)
  const headerId = title ? `palette-header-${title.replace(/\s+/g, "-").toLowerCase()}` : undefined

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
    if (e.key === "Escape") {
      setShowPalette(undefined)
    }
  }

  useEffect(() => {
    if (paletteRef.current) {
      setPaletteWidth(paletteRef.current.offsetWidth)
      paletteRef.current.focus()
    }
  }, [])

  const panelWidth = panelRect?.width || 72
  const paletteLeft = inBounds ? panelWidth - 5 : -(paletteWidth - 5)
  const wrapperStyle = {top: paletteTop || 0, left: paletteLeft, zIndex: 250}
  const pointerStyle = inBounds
    ? { left: -(pointerSize - 1) }
    : { right: -(pointerSize - 1) }
  return (
    <div className="codap-inspector-palette-wrapper" style={wrapperStyle}>
      <div ref={pointerRef} className={`palette-pointer ${inBounds ? "arrow-left" : "arrow-right"}`}
          style={{top: pointerTop - (paletteTop || 0), ...pointerStyle}} />
      <div ref={paletteRef} className="codap-inspector-palette" tabIndex={0}
          role="region" aria-labelledby={headerId}
          data-testid="codap-inspector-palette" onKeyDown={handleKeyDown}>
        <PaletteHeader id={headerId} Icon={Icon} title={title} />
        {children}
      </div>
    </div>
  )
}


interface IPaletteHeaderProps {
  id?: string
  Icon?: ReactNode
  title?: string
}

function PaletteHeader({ id, Icon, title }: IPaletteHeaderProps) {
  return (
    <header id={id} className="codap-inspector-palette-header" data-testid="codap-inspector-palette-header">
      {Icon && <span className="codap-inspector-palette-icon">{Icon}</span>}
      <span className="codap-inspector-palette-header-title">{title}</span>
    </header>
  )
}
