import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { kTileAriaRole } from "../accessibility-constants"
import { CodapComponentContext } from "../hooks/use-codap-component-context"
import { useTabTrap } from "../hooks/use-tab-trap"
import { TileInspectorContent, TileInspectorContext } from "../hooks/use-tile-inspector-context"
import { clearLastFocusedForTile } from "../hooks/use-tile-navigation"
import { TileModelContext } from "../hooks/use-tile-model-context"
import {
  FocusIgnoreEventType, FocusIgnoreFn, ITileSelection, TileSelectionContext
} from "../hooks/use-tile-selection-context"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { getTitle } from "../models/tiles/tile-content-info"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import { uniqueId } from "../utilities/js-utils"
import { t } from "../utilities/translation/translate"
import { InspectorPanelWrapper } from "./inspector-panel-wrapper"
import { ITileBaseProps } from "./tiles/tile-base-props"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  isMinimized?: boolean
  resizeButtonRef?: React.RefObject<HTMLButtonElement | null>
  onMinimizeTile?: () => void
  onCloseTile: (tileId: string) => void
  onMoveTilePointerDown?: (event: React.PointerEvent) => void
  onTabTrapReady?: (handler: (e: React.KeyboardEvent) => void) => void
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

export const CodapComponent = observer(function CodapComponent(props: IProps) {
  const { tile, hideTitleBar, isMinimized, resizeButtonRef,
    onMinimizeTile, onCloseTile, onMoveTilePointerDown, onTabTrapReady } = props
  const info = getTileComponentInfo(tile.content.type)
  const codapComponentRef = useRef<HTMLDivElement | null>(null)
  // Include the resize handle (rendered outside .codap-component by FreeTileComponent) in the tab cycle
  const getResizeHandle = useCallback(
    () => resizeButtonRef?.current ? [resizeButtonRef.current] : [],
    [resizeButtonRef]
  )
  const { onKeyDown: handleTabTrap } = useTabTrap({
    containerRef: codapComponentRef,
    getAdditionalElements: getResizeHandle
  })

  // Expose the tab trap handler to the parent so it can be passed as a prop
  // to the resize handle (which lives outside .codap-component in the DOM).
  useEffect(() => {
    onTabTrapReady?.(handleTabTrap)
  }, [handleTabTrap, onTabTrapReady])

  // Clean up last-focused tracking when tile unmounts
  useEffect(() => () => clearLastFocusedForTile(tile.id), [tile.id])

  const focused = uiState.isFocusedTile(tile.id) || uiState.isHoveredTile(tile.id)

  // useState for guaranteed lifetime
  const [tileSelection] = useState<TileSelectionHandler>(() => new TileSelectionHandler(tile))
  const tileInspectorContentTuple = useState<TileInspectorContent>(() => new TileInspectorContent())

  const handleFocusEvent = (event: FocusIgnoreEventType) => tileSelection.handleFocusEvent(event)

  if (!info) return null

  const { TitleBar, Component, tileEltClass } = info
  const classes = clsx("codap-component", tileEltClass, { focused, minimized: isMinimized })
  return (
    <TileModelContext.Provider value={tile}>
      <TileInspectorContext.Provider value={tileInspectorContentTuple}>
        <TileSelectionContext.Provider value={tileSelection}>
          <CodapComponentContext.Provider value={codapComponentRef}>
            <div
              aria-describedby={`tile-hint-${tile.id}`}
              aria-label={hideTitleBar ? (getTitle(tile) || tile.title) : undefined}
              aria-labelledby={hideTitleBar ? undefined : `tile-title-${tile.id}`}
              className={classes}
              data-testid={tileEltClass}
              key={tile.id}
              role={kTileAriaRole}
              onFocus={handleFocusEvent}
              onKeyDown={handleTabTrap}
              onPointerDownCapture={handleFocusEvent}
              ref={codapComponentRef}
            >
              <span id={`tile-hint-${tile.id}`} className="codap-visually-hidden">
                {t("V3.app.tileHint")}
              </span>
              {!hideTitleBar && (
                <TitleBar tile={tile} onMinimizeTile={onMinimizeTile} onCloseTile={onCloseTile}
                    onMoveTilePointerDown={onMoveTilePointerDown}/>
              )}
              <Component tile={tile} isMinimized={isMinimized} />
              <InspectorPanelWrapper tile={tile} isMinimized={isMinimized} />
            </div>
          </CodapComponentContext.Provider>
        </TileSelectionContext.Provider>
      </TileInspectorContext.Provider>
    </TileModelContext.Provider>
  )
})
