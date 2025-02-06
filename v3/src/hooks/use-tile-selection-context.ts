import React, { createContext, useContext } from "react"

export type FilterEventType = React.FocusEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
// return true to prevent tile focus
export type FocusFilterFn = (event: FilterEventType) => Maybe<boolean>

export interface ITileSelection {
  isTileSelected: () => boolean
  selectTile: () => void
  // returns disposer function for removing filter
  addFocusFilter: (filter: FocusFilterFn) => () => void
}

export const TileSelectionContext = createContext<ITileSelection | undefined>(undefined)

/**
 * The methods of ITileSelection apply to the component in which the hook is used
 *
 * @returns ITileSelection
 */
export const useTileSelectionContext = () => {
  const tileSelection = useContext(TileSelectionContext)
  if (!tileSelection) {
    throw new Error("useTileSelection must be used within a TileSelectionContext Provider")
  }
  return tileSelection
}
