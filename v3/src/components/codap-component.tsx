import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import React, { useRef, useState } from "react"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"
import { CodapComponentContext } from "../hooks/use-codap-component-context"
import { TileModelContext } from "../hooks/use-tile-model-context"
import {
  FocusIgnoreEventType, FocusIgnoreFn, ITileSelection, TileSelectionContext
} from "../hooks/use-tile-selection-context"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import { uniqueId } from "../utilities/js-utils"
import { InspectorPanelWrapper } from "./inspector-panel-wrapper"
import { ITileBaseProps } from "./tiles/tile-base-props"

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

class TileSelectionHandler implements ITileSelection {
  tile: ITileModel
  focusIgnoreMap = new Map<string, FocusIgnoreFn>()

  constructor(tile: ITileModel) {
    this.tile = tile
  }

  isTileSelected = () => {
    return uiState.isFocusedTile(this.tile.id)
  }

  selectTile = () => {
    uiState.setFocusedTile(this.tile.id)
  }

  handleFocusEvent = (event: React.FocusEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    if (!Array.from(this.focusIgnoreMap.values()).some(filter => filter(event))) {
      if (isAlive(this.tile)) {
        this.selectTile()
      }
      else {
        console.warn("TileSelectionHandler.handleFocusEvent ignoring focus of defunct tile")
      }
    }
  }

  addFocusIgnoreFn = (ignoreFn: FocusIgnoreFn) => {
    const id = uniqueId()
    this.focusIgnoreMap.set(id, ignoreFn)
    return () => this.focusIgnoreMap.delete(id)
  }
}

export const CodapComponent = observer(function CodapComponent({
  tile, isMinimized, onMinimizeTile, onCloseTile, onBottomRightPointerDown, onBottomLeftPointerDown,
  onRightPointerDown, onBottomPointerDown, onLeftPointerDown
}: IProps) {
  const info = getTileComponentInfo(tile.content.type)
  const codapComponentRef = useRef<HTMLDivElement | null>(null)

  // useState for guaranteed lifetime
  const [tileSelection] = useState<TileSelectionHandler>(() => new TileSelectionHandler(tile))

  const handleFocusEvent = (event: FocusIgnoreEventType) => tileSelection.handleFocusEvent(event)

  if (!info) return null

  const { TitleBar, Component, tileEltClass, isFixedWidth, isFixedHeight } = info
  const classes = clsx("codap-component", tileEltClass, { minimized: isMinimized },
                    { shadowed: uiState.isFocusedTile(tile.id) || uiState.isHoveredTile(tile.id) })
  return (
    <TileModelContext.Provider value={tile}>
      <TileSelectionContext.Provider value={tileSelection}>
        <CodapComponentContext.Provider value={codapComponentRef}>
          <div className={classes} ref={codapComponentRef} key={tile.id} data-testid={tileEltClass}
            onFocus={handleFocusEvent} onPointerDownCapture={handleFocusEvent}>
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
      </TileSelectionContext.Provider>
    </TileModelContext.Provider>
  )
})
