import { clsx } from "clsx"
import React, { forwardRef, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from "react"
import { Button, Menu, MenuTrigger, Popover, Tooltip, TooltipTrigger } from "react-aria-components"

import { useFocusTrap } from "../hooks/use-focus-trap"
import { useMouseTooltipRef } from "../hooks/use-mouse-tooltip-ref"
import { useRovingToolbarFocus } from "../hooks/use-roving-toolbar-focus"
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

function renderIcon(icon: ReactNode, isDecorative: boolean) {
  return isDecorative ? <span aria-hidden="true">{icon}</span> : icon
}

interface IProps {
  component?: string
  show?: boolean
  children: ReactNode
  setShowPalette?: (palette: string | undefined) => void
  toolbarAriaLabel?: string
  toolbarOrientation?: "horizontal" | "vertical"
  toolbarPersistenceKey?: string
  width?: "very-narrow" | "narrow" | "normal" | "wide"
}

const kTooltipDelay = 1000
const kTooltipPlacement = "bottom" as const
const kTooltipOffset = 15

export const InspectorPanel = forwardRef<HTMLDivElement, IProps>(function InspectorPanel({
  component, show, setShowPalette, children, toolbarAriaLabel,
  toolbarOrientation = "vertical", toolbarPersistenceKey, width
}, ref) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const mergedRef = useCallback((node: HTMLDivElement | null) => {
    panelRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }, [ref])
  useOutsidePointerDown({
    ref: panelRef as unknown as RefObject<HTMLElement>,
    handler: ()=> setShowPalette?.(undefined),
    enabled: !!(show && panelRef && setShowPalette),
    info: {name: "InspectorPanel", component}
  })
  const { onFocusCapture, onKeyDownCapture } = useRovingToolbarFocus({
    enabled: !!toolbarAriaLabel,
    getItems: () => {
      if (!panelRef.current) return []
      return Array.from(panelRef.current.querySelectorAll<HTMLElement>("[data-inspector-toolbar-item='true']"))
    },
    orientation: toolbarOrientation,
    persistenceKey: toolbarPersistenceKey
  })
  const classes = clsx("inspector-panel", component, width ?? "normal")
  return (show
    ? <div
        ref={mergedRef}
        aria-label={toolbarAriaLabel}
        aria-orientation={toolbarAriaLabel ? toolbarOrientation : undefined}
        className={classes}
        data-testid={"inspector-panel"}
        onFocusCapture={onFocusCapture}
        onKeyDownCapture={onKeyDownCapture}
        role={toolbarAriaLabel ? "toolbar" : undefined}
      >
        {children}
      </div>
    : null
  )
})

interface IInspectorButtonProps {
  "aria-controls"?: string
  "aria-expanded"?: boolean
  bottom?: boolean
  children: ReactNode
  isActive?: boolean
  isDisabled?: boolean
  label?: string
  onButtonClick?: (e: { target: Element }) => void
  onPointerDown?: (e: React.PointerEvent) => void
  testId: string
  tooltip: string
  top?: boolean
}

export const InspectorButton = forwardRef<HTMLButtonElement, IInspectorButtonProps>(function InspectorButton({
  "aria-controls": ariaControls, "aria-expanded": ariaExpanded, bottom, children,
  isActive, isDisabled, label, onButtonClick,
  onPointerDown, testId, tooltip, top
}: IInspectorButtonProps, ref) {
  const className = clsx("inspector-tool-button", { active: isActive, bottom, top })
  const hasVisibleLabel = !!label
  const { triggerRef, onMouseMove } = useMouseTooltipRef()
  return (
    <TooltipTrigger delay={kTooltipDelay}>
      <Button
        aria-controls={ariaControls}
        aria-disabled={isDisabled || undefined}
        aria-expanded={ariaExpanded}
        aria-label={ariaLabel(label, tooltip)}
        className={className}
        data-inspector-toolbar-item="true"
        data-testid={testId}
        excludeFromTabOrder={isDisabled}
        onMouseMove={onMouseMove}
        onPointerDown={!isDisabled ? onPointerDown : undefined}
        onPress={!isDisabled ? onButtonClick : undefined}
        ref={ref}
      >
        {renderIcon(children, hasVisibleLabel)}
        {label && <span className="inspector-button-label">{label}</span>}
      </Button>
      <Tooltip
        className="inspector-tooltip"
        offset={kTooltipOffset}
        placement={kTooltipPlacement}
        triggerRef={triggerRef}
      >
        {tooltip}
      </Tooltip>
    </TooltipTrigger>
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
  const hasVisibleLabel = !!label
  const { triggerRef, onMouseMove } = useMouseTooltipRef()

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      onButtonClick?.()
      onOpen?.()
    }
  }, [onButtonClick, onOpen])

  return (
    <TooltipTrigger delay={kTooltipDelay}>
      <MenuTrigger onOpenChange={handleOpenChange}>
        <Button
          aria-label={ariaLabel(label, tooltip)}
          className={classes}
          data-inspector-toolbar-item="true"
          data-testid={testId}
          onMouseMove={onMouseMove}
        >
          {renderIcon(icon, hasVisibleLabel)}
          {label && <span className="inspector-button-label">{label}</span>}
        </Button>
        {children}
      </MenuTrigger>
      <Tooltip
        className="inspector-tooltip"
        offset={kTooltipOffset}
        placement={kTooltipPlacement}
        triggerRef={triggerRef}
      >
        {tooltip}
      </Tooltip>
    </TooltipTrigger>
  )
}

interface IInspectorMenuContentProps {
  children: ReactNode
  "data-testid"?: string
}

export function InspectorMenuContent({ children, ...props }: IInspectorMenuContentProps) {
  return (
    <Popover className="inspector-menu-popover">
      <Menu className="inspector-menu-list" {...props}>
        {children}
      </Menu>
    </Popover>
  )
}

interface IInspectorPalette {
  children: ReactNode
  Icon?: ReactNode
  id?: string
  title: string
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const InspectorPalette = ({children, Icon, id, title, panelRect, buttonRect,
     setShowPalette}:IInspectorPalette) => {
  const pointerSize = 10
  const panelTop = panelRect?.top || 0
  const panelRight = panelRect?.right || 0
  const buttonTop = buttonRect?.top || 0
  const buttonHeight = buttonRect?.height || 52
  const [paletteWidth, setPaletteWidth] = useState(0)
  const [paletteHeight, setPaletteHeight] = useState(0)
  const paletteRef = useRef<HTMLDivElement>(null)
  useFocusTrap(paletteRef)
  const pointerRef = useRef<HTMLDivElement>(null)
  const viewportEl = paletteRef.current?.closest(".tile-row")
  const [inBounds, setInBounds] = useState(() => isWithinBounds(panelRight, paletteRef.current))
  const tempPaletteTop = paletteRef.current?.getBoundingClientRect().top
  const pointerTop = buttonTop - panelTop + buttonHeight / 2 - pointerSize
  const pointerMidpoint = pointerTop + pointerSize
  const paletteTop = (tempPaletteTop && paletteHeight) &&
    getPaletteTopPosition(tempPaletteTop, paletteHeight, pointerMidpoint)
  const headerId = title ? `palette-header-${title.replace(/\s+/g, "-").toLowerCase()}` : undefined
  useEffect(()=> {
    const observer = viewportEl && new ResizeObserver(() => {
      if (panelRight && paletteRef.current) {
        setInBounds(isWithinBounds(panelRight, paletteRef.current))
      }
    })
    viewportEl && observer?.observe(viewportEl)
    return () => observer?.disconnect()
  }, [panelRight, viewportEl])

  // Track palette height changes so positioning updates when content shrinks/grows
  useEffect(() => {
    const el = paletteRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setPaletteHeight(el.offsetHeight)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setShowPalette(undefined)
    }
  }

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    if (paletteRef.current) {
      setPaletteWidth(paletteRef.current.offsetWidth)
      paletteRef.current.focus()
    }
    return () => {
      previousFocus?.focus()
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
      <div ref={paletteRef} className="codap-inspector-palette" id={id} tabIndex={-1}
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
  title: string
}

function PaletteHeader({ id, Icon, title }: IPaletteHeaderProps) {
  return (
    <header id={id} className="codap-inspector-palette-header" data-testid="codap-inspector-palette-header">
      {Icon && <span className="codap-inspector-palette-icon" aria-hidden="true">{Icon}</span>}
      <span className="codap-inspector-palette-header-title">{title}</span>
    </header>
  )
}
