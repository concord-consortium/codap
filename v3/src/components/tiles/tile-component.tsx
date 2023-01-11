import { observer } from "mobx-react-lite"
import React from "react"
import { ITileModel } from "../../models/tiles/tile-model"

import "./tile-component.scss"

export interface ITileProps {
  tile: ITileModel
}
export const TileComponent = observer(({ tile }: ITileProps) => {

  return (
    <div className="tile-component">
    </div>
  )
})
