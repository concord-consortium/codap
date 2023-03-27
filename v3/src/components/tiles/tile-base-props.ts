import { ReactNode } from "react"
import { ITileModel } from "../../models/tiles/tile-model"

export interface ITileBaseProps {
  tile?: ITileModel
}

export interface ITileTitleBarProps extends ITileBaseProps {
  title?: string
  children?: ReactNode
  onHandleTitleBarClick?: (e: React.MouseEvent) => void
  onCloseTile?: (tileId: string) => void
}
