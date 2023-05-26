import { ReactNode } from "react"
import { ITileModel } from "../../models/tiles/tile-model"

export interface ITileBaseProps {
  tile?: ITileModel
}

export interface ITileTitleBarProps extends ITileBaseProps {
  // pass accessor function so that only title bar is re-rendered when title changes
  getTitle?: () => string | undefined
  children?: ReactNode
  onHandleTitleBarClick?: (e: React.MouseEvent) => void
  onHandleTitleChange?: () => void
  onCloseTile?: (tileId: string) => void
}

export interface ITileInspectorPanelProps extends ITileBaseProps{
  show?: boolean
}
