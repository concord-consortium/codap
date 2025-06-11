import React, { ReactNode } from "react"
import { ITileModel } from "../../models/tiles/tile-model"

export interface ITileBaseProps {
  tile?: ITileModel
  isMinimized?: boolean
}

export interface ITileTitleBarProps extends ITileBaseProps {
  children?: ReactNode
  onHandleTitleBarClick?: (e: React.MouseEvent) => void
  onHandleTitleChange?: (newValue?: string) => void
  onMinimizeTile?: () => void
  onCloseTile?: (tileId: string) => void
  onMoveTilePointerDown?: (event: React.PointerEvent) => void
  initiateEditTitle?: boolean
  preventTitleChange?: boolean
}

export interface ITileInspectorPanelProps extends ITileBaseProps {
  show?: boolean
}
