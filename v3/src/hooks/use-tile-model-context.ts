import { createContext, useCallback, useContext } from "react"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"

export const TileModelContext = createContext<ITileModel | undefined>(undefined)

export const useTileModelContext = () => {
  const tile = useContext(TileModelContext)

  const isTileSelected = useCallback(function isTileSelected() {
    return uiState.isFocusedTile(tile?.id)
  }, [tile])

  return { tile, isTileSelected }
}
