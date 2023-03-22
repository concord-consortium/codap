import { createContext, useContext } from "react"

export interface ITileDisplayContext {
  width: number | undefined,
  left: number | undefined,
}

const nullTileDisplay: ITileDisplayContext = {
  width: undefined,
  left: undefined,
}

export const TileDisplayContext = createContext(nullTileDisplay)
export const useTileDisplayContext = () => useContext(TileDisplayContext)
