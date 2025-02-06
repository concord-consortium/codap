import React, { createContext, useContext } from "react"

export type FocusIgnoreEventType = React.FocusEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
// return true to prevent tile focus
export type FocusIgnoreFn = (event: FocusIgnoreEventType) => Maybe<boolean>

export interface ITileSelection {
  isTileSelected: () => boolean
  selectTile: () => void
  // returns disposer function for removing filter
  addFocusIgnoreFn: (ignoreFn: FocusIgnoreFn) => () => void
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
