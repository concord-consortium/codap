import { useCallback, useEffect, useRef, useState } from "react"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"
import { TRenderHeaderCellProps } from "./case-table-types"

// RDG's shouldFocusGrid logic always sets tabindex="0" on the first header cell (index 0).
// Since that cell is inert (the index column header), the grid has no focusable entry point.
// Transfer tabindex="0" to the next sibling header cell so the grid remains reachable via Tab.
function transferTabIndex(inertCell: HTMLElement) {
  if (inertCell.getAttribute("tabindex") === "0") {
    const next = inertCell.nextElementSibling as HTMLElement | null
    if (next?.tabIndex === -1) next.tabIndex = 0
  }
}

function getDividerBounds(containerBounds: DOMRect, cellBounds: DOMRect) {
  const kTableDividerWidth = 7
  const kTableDividerOffset = Math.floor(kTableDividerWidth / 2)
  return {
    top: cellBounds.top - containerBounds.top,
    left: cellBounds.right - containerBounds.left - kTableDividerOffset - 1,
    width: kTableDividerWidth,
    height: cellBounds.height
  }
}

// wrapper component because RDG doesn't like observer components as header cell renderers
export function ColumnHeader(props: TRenderHeaderCellProps) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [cellElt, setCellElt] = useState<HTMLElement | null>(null)

  // The AttributeHeader component renders the actual content of the cell, i.e. the attribute
  // name. For certain interactions, however, notably involving focus and drag/drop, it's
  // useful for the child to know about the containing cell element, so we pass this function
  // to the AttributeHeader component as `onSetContentElt`, which then returns the relevant
  // parent/cell element back to the AttributeHeader.
  const handleSetHeaderContentElt = useCallback((contentElt: HTMLDivElement | null) => {
    contentRef.current = contentElt
    const _cellElt: HTMLElement | null = contentRef.current?.closest(".rdg-cell") ?? null
    // Make the index column header cell inert — it has no interactive function.
    // `inert` prevents focus regardless of RDG resetting tabIndex on re-renders.
    if (_cellElt && props.column.key === kIndexColumnKey) {
      _cellElt.inert = true
      transferTabIndex(_cellElt)
    }
    setCellElt(_cellElt)
    return _cellElt
  }, [props.column.key])

  // RDG doesn't support selecting or editing column headers, so we implement that ourselves.
  // To signal selection, we set/clear the `aria-selected` attribute when editing, which
  // triggers the browser's default cell highlighting.
  const setAriaSelectedAttribute = useCallback(() => {
    cellElt?.setAttribute("aria-selected", "true")
  }, [cellElt])

  const clearAriaSelectedAttribute = useCallback(() => {
    cellElt?.setAttribute("aria-selected", "false")
  }, [cellElt])

  const handleOpenMenu = useCallback(() => {
    setAriaSelectedAttribute()
    cellElt?.classList.add("menu-open")
  }, [cellElt, setAriaSelectedAttribute])

  const handleCloseMenu = useCallback(() => {
    cellElt?.classList.remove("menu-open")
  }, [cellElt])

  // Watch for RDG re-renders that reset tabindex="0" on the inert index column header.
  // When detected, transfer it to the next sibling so the grid stays reachable via Tab.
  useEffect(() => {
    if (!cellElt || props.column.key !== kIndexColumnKey) return

    const observer = new MutationObserver(() => transferTabIndex(cellElt))
    observer.observe(cellElt, { attributes: true, attributeFilter: ["tabindex"] })
    return () => observer.disconnect()
  }, [cellElt, props.column.key])

  return <AttributeHeader attributeId={props.column.key}
            allowTwoLines={true}
            getDividerBounds={getDividerBounds}
            onSetHeaderContentElt={handleSetHeaderContentElt}
            onBeginEdit={setAriaSelectedAttribute}
            onEndEdit={clearAriaSelectedAttribute}
            onOpenMenu={handleOpenMenu}
            onCloseMenu={handleCloseMenu}/>
}
