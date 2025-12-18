import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { PointerEvent, useCallback, useEffect, useRef, useState } from "react"
import { ComponentWrapperContext } from "../../hooks/use-component-wrapper-context"
import { FreeTileLayoutContext } from "../../hooks/use-free-tile-layout-context"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { kDefaultMinWidth } from "../../models/tiles/tile-layout"
import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { uiState } from "../../models/ui-state"
import { urlParams } from "../../utilities/url-params"
import { CodapComponent } from "../codap-component"
import {
  IChangingTileStyle, kCodapTileClass, kStandaloneTileClass, kStandaloneZIndex, kTitleBarHeight
} from "../constants"
import { ComponentResizeWidgets } from "./component-resize-widgets"
import { useTileDrag } from "./use-tile-drag"

interface IProps {
  row: IFreeTileRow
  tile: ITileModel
  onCloseTile: (tileId: string) => void
}

const getSafeTileWidth = (width?: number) => {
  return width != null ? Math.max(width, kDefaultMinWidth) : kDefaultMinWidth
}

export const FreeTileComponent = observer(function FreeTileComponent({ row, tile, onCloseTile}: IProps) {
  const componentRef = useRef<HTMLDivElement | null>(null)
  const { id: tileId, content: { type: tileType } } = tile
  const [useDefaultCreationStyle, setUseDefaultCreationStyle] = useState(row.animateCreationTiles.has(tileId))
  const [changingTileStyle, setChangingTileStyle] = useState<Maybe<IChangingTileStyle>>()
  const tileLayout: Maybe<IFreeTileLayout> = row.tiles.get(tileId)
  const {
    isHidden, isMinimized, position: { x: left, y: top }, setMinimized, width, height, zIndex
  } = tileLayout || { position: { x: 0, y: 0 } }
  // when animating creation, use the default creation style on the first render
  const tileStyle: React.CSSProperties = useDefaultCreationStyle
          ? { left: 0, top: 0, width: 0, height: kTitleBarHeight, zIndex }
          : { left, top, width, height, zIndex }

  useEffect(() => {
    // after the first render, render the actual style; CSS transitions will handle the animation
    setUseDefaultCreationStyle(false)
  }, [])

  const handleMinimizeTile = useCallback(() => {
    const logString = isMinimized ? "Expanded component" : "Minimized component"
    if (setMinimized) {
      tile.applyModelChange(() => {
        setMinimized(!isMinimized)
      }, {
        notify: updateTileNotification("toggle minimize component", {}, tile),
        log: logMessageWithReplacement(logString, {}, "component"),
        undoStringKey: "DG.Undo.component.minimize",
        redoStringKey: "DG.Redo.component.minimize"
      })

    }
  }, [isMinimized, setMinimized, tile])

  const { handlePointerDown: handleMoveTilePointerDown } = useTileDrag({ row, tile, tileLayout, setChangingTileStyle })

  const handleResizePointerDown = useCallback((e: PointerEvent, _tileLayout: IFreeTileLayout, direction: string) => {
    uiState.setFocusedTile(tileId)

    if (e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const startWidth = _tileLayout.width
    const startHeight = _tileLayout.height
    const startPosition = {x: e.pageX, y: e.pageY}

    let resizingWidth = startWidth, resizingHeight = startHeight, resizingLeft = _tileLayout.x
    const startLeft = _tileLayout.x

    const handlePointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      const xDelta = pointerMoveEvent.pageX - startPosition.x
      const yDelta = pointerMoveEvent.pageY - startPosition.y
      const addIfDefined = (x: number | undefined, delta: number) => x != null ? x + delta : x

      if (direction.includes("left")) {
        resizingWidth = addIfDefined(startWidth, -xDelta)
        resizingLeft = startLeft + xDelta
      }
      if (direction.includes("bottom")) {
        resizingHeight = addIfDefined(startHeight, yDelta)
      }
      if (direction.includes("right")) {
        resizingWidth = addIfDefined(startWidth, xDelta)
      }

      setChangingTileStyle({
        left: resizingLeft,
        top: _tileLayout.y,
        width: getSafeTileWidth(resizingWidth),
        height: resizingHeight,
        zIndex: _tileLayout.zIndex,
        transition: "none"
      })
    }
    const handlePointerUp = () => {
      const newWidth = getSafeTileWidth(resizingWidth)
      document.body.removeEventListener("pointermove", handlePointerMove, { capture: true })
      document.body.removeEventListener("pointerup", handlePointerUp, { capture: true })
      row.applyModelChange(() => {
        _tileLayout.setSize(newWidth, resizingHeight)
        _tileLayout.setPosition(resizingLeft, _tileLayout.y)
      }, {
        notify: () => updateTileNotification("resize", {}, tile),
        undoStringKey: "DG.Undo.componentResize",
        redoStringKey: "DG.Redo.componentResize",
        log: logMessageWithReplacement("Resized component: %@", {tileID: _tileLayout.tileId})
      })
      setChangingTileStyle(undefined)
    }

    document.body.addEventListener("pointermove", handlePointerMove, { capture: true })
    document.body.addEventListener("pointerup", handlePointerUp, { capture: true })
  }, [row, tile, tileId])

  const info = getTileComponentInfo(tileType)
  const isStandalone = uiState.isStandaloneTile(tile)

  // Calculate style - standalone components are styled in CSS
  const standaloneStyle: React.CSSProperties = {}

  const style = changingTileStyle ??
                  (isHidden && info?.renderWhenHidden
                    ? { left: -9999, top: -9999, width: 0, height: 0 }
                    : isStandalone
                      ? standaloneStyle
                      : isMinimized
                        ? { left, top, width, zIndex }
                        : tileStyle)
  // don't impose a width and height for fixed size or standalone components
  if (info?.isFixedWidth) delete style?.width
  if (info?.isFixedHeight) delete style?.height
  const disableAnimation = urlParams.noComponentAnimation !== undefined
  const classes = clsx(kCodapTileClass, {
                        minimized: isMinimized,
                        "disable-animation": disableAnimation,
                        [kStandaloneTileClass]: isStandalone
                      })

  // The CSS transition used to animate the tile can cause child components to prematurely apply effects that depend on
  // the tile's dimensions. To prevent this, we add a transitionend handler that sets a flag on the tile model when the
  // transition completes. Child components can check this flag to avoid or counteract premature application of effects.
  // TODO: perhaps some tiles will want to use something like transitionComplete
  // to avoid unnecessary calculations during all types of tile resizing.
  // In that case perhaps we should use debouncing and just monitor
  // the size of the tile instead of using the transitionend event.
  useEffect(function addTransitionEndHandler() {
    if (tile.transitionComplete) {
      // If the initial animation is already complete we don't need do anything
      return
    }
    const element = document.getElementById(`${tileId}`)

    const handleTransitionEnd = () => {
      // Because the transitions of left, top, width, and height, in theory might finish at different times we wait for
      // the width and height to be complete before setting the transitionComplete flag.
      if (element?.offsetWidth !== width && element?.offsetHeight !== height) {
        // This has never been seen in practice, but if it does happen we probably want to know about it.
        // Perhaps some browser will not run the transitions to the exact final size which would then break the
        // transitionComplete logic.
        console.warn("Transition ended but tile dimensions are not complete", {
          tileId, elementWidth: element?.offsetWidth, elementHeight: element?.offsetHeight,
          expectedWidth: width, expectedHeight: height
        })
        return
      }
      tile.setTransitionComplete(true)
      // remove the event listener because future tile resizing can trigger this again
      element?.removeEventListener("transitionend", handleTransitionEnd)
    }

    // If we are not animating the creation of this tile, the transitionend event will never fire.
    // So we set the tile's transitionComplete immediately to true.
    if (disableAnimation || !row.animateCreationTiles.has(tileId)) {
      tile.setTransitionComplete(true)
      return
    }

    // NOTE: this will be called for each CSS property that is transitioning
    element?.addEventListener("transitionend", handleTransitionEnd)

    return () => element?.removeEventListener("transitionend", handleTransitionEnd)
  }, [tile, tileId, disableAnimation, row.animateCreationTiles, width, height])

  if (!info || (isHidden && !info.renderWhenHidden)) return null

  const { isFixedWidth, isFixedHeight } = info

  return (
    <ComponentWrapperContext.Provider value={componentRef}>
      <FreeTileLayoutContext.Provider value={tileLayout}>
        <div id={tileId} className={classes} style={style} key={tileId} ref={componentRef}
            data-tile-z-index={isStandalone ? kStandaloneZIndex : zIndex}>
          {tile && tileLayout &&
            <>
              <CodapComponent tile={tile}
                hideTitleBar={isStandalone}
                isMinimized={isMinimized}
                onMinimizeTile={handleMinimizeTile}
                onCloseTile={onCloseTile}
                onMoveTilePointerDown={handleMoveTilePointerDown}
              />
              {!isMinimized && !isStandalone &&
                <ComponentResizeWidgets tile={tile} componentRef={componentRef}
                  isFixedWidth={isFixedWidth} isFixedHeight={isFixedHeight}
                  handleResizePointerDown={handleResizePointerDown} />
              }
            </>
          }
        </div>
      </FreeTileLayoutContext.Provider>
    </ComponentWrapperContext.Provider>
  )
})
