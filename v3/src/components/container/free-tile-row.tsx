import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { useScrollableContainer } from "../../hooks/use-scrollable-container"
import { TileContainerContext } from "../../hooks/use-tile-container-context"
import { IFreeTileRow } from "../../models/document/free-tile-row"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { mstReaction } from "../../utilities/mst-reaction"
import { kDragContainerClass } from "./container-constants"
import { FreeTileComponent } from "./free-tile-component"

import "./free-tile-row.scss"

interface IFreeTileRowProps {
  row: IFreeTileRow
  getTile: (tileId: string) => ITileModel | undefined
  onCloseTile: (tileId: string) => void
}
export const FreeTileRowComponent = observer(function FreeTileRowComponent(
  { row, getTile, onCloseTile }: IFreeTileRowProps) {

  const rowRef = useRef<HTMLDivElement | null>(null)
  useScrollableContainer(rowRef.current)

  // focused tile should always be on top
  useEffect(() => {
    return mstReaction(
      () => uiState.focusedTile,
      focusedTileId => {
        if (focusedTileId && (focusedTileId !== row.last)) {
          row.moveTileToTop(focusedTileId, getTile(focusedTileId)?.content.allowBringToFront)
        }
      }, { name: "FreeTileRowComponent.useEffect.autorun [uiState.focusedTile => row.last]" }, row)
  }, [getTile, row])

  // focused tile should always be on top
  useEffect(() => {
    return mstReaction(
      () => row.last,
      topTileId => {
        if (topTileId && (topTileId !== uiState.focusedTile)) {
          uiState.setFocusedTile(topTileId)
        }
      }, { name: "FreeTileRowComponent.useEffect.autorun [row.last => uiState.focusedTile]" }, row)
  }, [row])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target === rowRef.current) {
      uiState.setFocusedTile()
    }
  }

  const classes = clsx("free-tile-row", "free-tile-container", "tile-row", kDragContainerClass)

  return (
    <TileContainerContext.Provider value={rowRef}>
      <div className={classes} ref={rowRef} onPointerDown={handlePointerDown}>
        {
          row?.tileIds.map(tileId => {
            const tile = getTile(tileId)
            return (
              tile && <FreeTileComponent row={row} tile={tile} onCloseTile={onCloseTile} key={tileId}/>
            )
          })
        }
      </div>
    </TileContainerContext.Provider>
  )
})
