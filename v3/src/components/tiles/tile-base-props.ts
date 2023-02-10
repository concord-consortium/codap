import { ITileModel } from "../../models/tiles/tile-model"

export interface ITileBaseProps {
  tile?: ITileModel
}

export interface ITileTitleBarProps extends ITileBaseProps {
  onCloseTile: (tileId: string) => void
}
