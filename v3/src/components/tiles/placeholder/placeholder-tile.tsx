import React from "react"
import { ITileModel } from "../../../models/tiles/tile-model"

interface IProps {
  tile: ITileModel
}
export const PlaceholderTileComponent = ({ tile }: IProps) => {

  return (
    <div className="tile-component">
    </div>
  )
}
