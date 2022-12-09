import React from "react"
import { ITileModel } from "../../models/tiles/tile-model"

import "./tile-component.scss"

export interface ITileProps {
  tile: ITileModel
}
export const TileComponent = ({ tile }: ITileProps) => {

  return (
    <div className="tile-component">
    </div>
  )
}
