import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { IFreeTileRow } from "../models/document/free-tile-row"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
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

  // focused tile should always be on top
  useEffect(() => {
    return autorun(() => {
      const { focusedTile } = uiState
      if (focusedTile && (focusedTile !== row.last)) {
        row.moveTileToTop(focusedTile)
      }
    })
  }, [row])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target === rowRef.current) {
      uiState.setFocusedTile()
    }
  }

  return (
    <div className="free-tile-row tile-row" ref={rowRef} onPointerDown={handlePointerDown}>
      {
        row?.tileIds.map(tileId => {
          const tile = getTile(tileId)
          return (
            tile && <FreeTileComponent row={row} tile={tile} onCloseTile={onCloseTile} key={tileId}/>
          )
        })
      }
    </div>
  )
})
