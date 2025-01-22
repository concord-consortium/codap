import { createContext, useContext } from "react"

export interface ITileSelection {
  isTileSelected: () => boolean
  selectTile: () => void
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
