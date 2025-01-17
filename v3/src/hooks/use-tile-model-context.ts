import { createContext, useContext } from "react"
import { ITileModel } from "../models/tiles/tile-model"

export const TileModelContext = createContext<ITileModel | undefined>(undefined)

export const useTileModelContext = () => {
  const tile = useContext(TileModelContext)
  const transitionComplete = tile?.transitionComplete ?? false

  return { tile, tileId: tile?.id, transitionComplete }
}
