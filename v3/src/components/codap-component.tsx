import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import React, { useRef } from "react"
import { CodapComponentContext } from "../hooks/use-codap-component-context"
import { TileModelContext } from "../hooks/use-tile-model-context"
import { InspectorPanelWrapper } from "./inspector-panel-wrapper"
import { ITileBaseProps } from "./tiles/tile-base-props"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  isMinimized?: boolean
  onMinimizeTile?: () => void
  onCloseTile: (tileId: string) => void
  onBottomRightPointerDown?: (e: React.PointerEvent) => void
  onBottomLeftPointerDown?: (e: React.PointerEvent) => void
  onRightPointerDown?: (e: React.PointerEvent) => void
  onBottomPointerDown?: (e: React.PointerEvent) => void
  onLeftPointerDown?: (e: React.PointerEvent) => void
}

export const CodapComponent = observer(function CodapComponent({
  tile, isMinimized, onMinimizeTile, onCloseTile, onBottomRightPointerDown, onBottomLeftPointerDown,
  onRightPointerDown, onBottomPointerDown, onLeftPointerDown
}: IProps) {
  const info = getTileComponentInfo(tile.content.type)
  const codapComponentRef = useRef<HTMLDivElement | null>(null)

  function handleFocusTile() {
    if (isAlive(tile)) {
      uiState.setFocusedTile(tile.id)
    }
    else {
      console.warn("CodapComponent.handleFocusTile ignoring focus of defunct tile")
    }
  }

  if (!info) return null

  const { TitleBar, Component, tileEltClass, isFixedWidth, isFixedHeight } = info
  const classes = clsx("codap-component", tileEltClass, { minimized: isMinimized },
                    { shadowed: uiState.isFocusedTile(tile.id) || uiState.isHoveredTile(tile.id) })
  return (
    <TileModelContext.Provider value={tile}>
      <CodapComponentContext.Provider value={codapComponentRef}>
        <div className={classes} ref={codapComponentRef} key={tile.id} data-testid={tileEltClass}
          onFocus={handleFocusTile} onPointerDownCapture={handleFocusTile}>
          <TitleBar tile={tile} onMinimizeTile={onMinimizeTile} onCloseTile={onCloseTile}/>
          <Component tile={tile} isMinimized={isMinimized} />
          {onRightPointerDown && !isFixedWidth && !isMinimized &&
            <div className="codap-component-border right" onPointerDown={onRightPointerDown}/>}
          {onBottomPointerDown && !isFixedHeight && !isMinimized &&
            <div className="codap-component-border bottom" onPointerDown={onBottomPointerDown}/>}
          {onLeftPointerDown && !isFixedWidth && !isMinimized &&
            <div className="codap-component-border left" onPointerDown={onLeftPointerDown}/>}
          {onBottomLeftPointerDown && !(isFixedWidth && isFixedHeight) && !isMinimized &&
            <div className="codap-component-corner bottom-left" onPointerDown={onBottomLeftPointerDown}/>
          }
          {onBottomRightPointerDown && !(isFixedWidth && isFixedHeight) && !isMinimized &&
            <div className="codap-component-corner bottom-right" onPointerDown={onBottomRightPointerDown}>
              {(uiState.isFocusedTile(tile.id)) && !isMinimized &&
                <ResizeHandle className="component-resize-handle"/>}
            </div>
          }

        </div>
        <InspectorPanelWrapper tile={tile} isMinimized={isMinimized} />
      </CodapComponentContext.Provider>
    </TileModelContext.Provider>
  )
})
