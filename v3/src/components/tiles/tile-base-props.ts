import { ITileModel } from "../../models/tiles/tile-model"

export interface ITileBaseProps {
  tile?: ITileModel
}

export interface ITileTitleBarProps extends ITileBaseProps {
  onHandleTitleBarClick?: (e: React.MouseEvent) => void
  onCloseTile: (tileId: string) => void
}

export interface ITileInspectorPanelProps extends ITileBaseProps{
  show?: boolean
}
