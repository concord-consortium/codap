import { createContext, useCallback, useContext } from "react"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"

export const TileModelContext = createContext<ITileModel | undefined>(undefined)

export const useTileModelContext = () => {
  const tile = useContext(TileModelContext)
  const transitionComplete = tile?.transitionComplete ?? false

  const isTileSelected = useCallback(function isTileSelected() {
    const isFocused = uiState.isFocusedTile(tile?.id)
    return isFocused
  }, [tile])

  const selectTile = useCallback(function selectTile() {
    uiState.setFocusedTile(tile?.id)
  }, [tile])

  return { tile, tileId: tile?.id, isTileSelected, selectTile, transitionComplete }
}
