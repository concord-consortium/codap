import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { IDocumentContentModel } from "../models/document/document-content"
import { IFreeTileRow } from "../models/document/free-tile-row"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import { FreeTileComponent } from "./free-tile-component"

import styles from "./free-tile-row.module.scss"

interface IFreeTileRowProps {
  content?: IDocumentContentModel
  row: IFreeTileRow
  getTile: (tileId: string) => ITileModel | undefined
}
export const FreeTileRowComponent = observer(function FreeTileRowComponent(
  { content, row, getTile }: IFreeTileRowProps) {

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

  function handleCloseTile(tileId: string) {
    tileId && content?.deleteTile(tileId)
  }

  return (
    <div className={`free-tile-row ${styles['free-tile-row']}`} ref={rowRef} onPointerDown={handlePointerDown}>
      {
        row?.tileIds.map(tileId => {
          const tile = getTile(tileId)
          return (
            tile && <FreeTileComponent row={row} tile={tile} onCloseTile={handleCloseTile} key={tileId}/>
          )
        })
      }
    </div>
  )
})
