// used in lieu of attribute id for index column for ReactDataGrid
export const kIndexColumnKey = "__index__"

export interface SimpleDOMRect {
  top: number
  left: number
  width: number
  height: number
}

export type GetDividerBoundsFn = (containerBounds: DOMRect, cellBounds: DOMRect) => Maybe<SimpleDOMRect>

export interface IDividerProps {
  before?: boolean
  columnKey: string
  cellElt: HTMLElement | null
  getDividerBounds?: GetDividerBoundsFn
}

export const excludeDragOverlayRegEx = new RegExp(`${kIndexColumnKey}$`)
