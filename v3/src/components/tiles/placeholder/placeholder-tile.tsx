import { ITileModel } from "../../../models/tiles/tile-model"

import "./placeholder-tile.scss"

interface IProps {
  tile?: ITileModel
}
export const PlaceholderTileComponent = ({ tile }: IProps) => {

  return (
    <div className="tile-component">
    </div>
  )
}
