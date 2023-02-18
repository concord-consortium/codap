import { ITileModel } from "../../models/tiles/tile-model"

export interface ITileBaseProps {
  tile?: ITileModel
}

export interface ITileTitleBarProps extends ITileBaseProps {
  isEditingTitle: boolean
  onHandleTitleBarClick?: (e: React.MouseEvent) => void
  onCloseTile: (tileId: string) => void
  setIsEditingTitle: (editing: boolean) => void
}
