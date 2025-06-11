import { Portal } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { PointerEvent, useCallback, useEffect, useRef, useState } from "react"
import ResizeHandle from "../../assets/icons/icon-corner-resize-handle.svg"
import { ComponentWrapperContext } from "../../hooks/use-component-wrapper-context"
import { useTileContainerContext } from "../../hooks/use-tile-container-context"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { urlParams } from "../../utilities/url-params"
import { CodapComponent } from "../codap-component"
import { ComponentResizeBorder } from "../component-resize-border"
import { kTitleBarHeight } from "../constants"
import { useTileDrag } from "./use-tile-drag"

interface IProps {
  row: IFreeTileRow
  tile: ITileModel
  onCloseTile: (tileId: string) => void
}

export const FreeTileComponent = observer(function FreeTileComponent({ row, tile, onCloseTile}: IProps) {
  const containerRef = useTileContainerContext()
  const componentRef = useRef<HTMLDivElement | null>(null)
  const { id: tileId, content: { type: tileType } } = tile
  const [useDefaultCreationStyle, setUseDefaultCreationStyle] = useState(row.animateCreationTiles.has(tileId))
  const [resizingTileStyle, setResizingTileStyle] =
    useState<{left: number, top: number, width?: number, height?: number, zIndex?: number, transition: string}>()
  const [resizingTileId, setResizingTileId] = useState("")
  const rowTile = row.tiles.get(tileId)
  const { position: { x: left, y: top }, width, height, zIndex } = rowTile || { position: { x: 0, y: 0 } }
  // when animating creation, use the default creation style on the first render
  const tileStyle: React.CSSProperties = useDefaultCreationStyle
          ? { left: 0, top: 0, width: 0, height: kTitleBarHeight, zIndex }
          : { left, top, width, height, zIndex }

  useEffect(() => {
    // after the first render, render the actual style; CSS transitions will handle the animation
    setUseDefaultCreationStyle(false)
  }, [])

  const handleMinimizeTile = useCallback(() => {
    rowTile?.setMinimized(!rowTile.isMinimized)
  }, [rowTile])

  const { handlePointerDown: handleMoveTilePointerDown } = useTileDrag({ containerRef, row, tileLayout: rowTile })

  const handleResizePointerDown = useCallback((e: PointerEvent, tileLayout: IFreeTileLayout, direction: string) => {
    if (e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const startWidth = tileLayout.width
    const startHeight = tileLayout.height
    const startPosition = {x: e.pageX, y: e.pageY}

    let resizingWidth = startWidth, resizingHeight = startHeight, resizingLeft = tileLayout.x
    const startLeft = tileLayout.x

    const handlePointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      setResizingTileId(tileLayout.tileId)
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

      setResizingTileStyle({
        left: resizingLeft, top: tileLayout.y,
        width: resizingWidth, height: resizingHeight,
        zIndex: tileLayout.zIndex,
        transition: "none"
      })
    }
    const handlePointerUp = () => {
      document.body.removeEventListener("pointermove", handlePointerMove, { capture: true })
      document.body.removeEventListener("pointerup", handlePointerUp, { capture: true })
      row.applyModelChange(() => {
        tileLayout.setSize(resizingWidth, resizingHeight)
        tileLayout.setPosition(resizingLeft, tileLayout.y)
      }, {
        undoStringKey: "DG.Undo.componentResize",
        redoStringKey: "DG.Redo.componentResize",
        log: logMessageWithReplacement("Resized component: %@", {tileID: resizingTileId})
      })
      setResizingTileId("")
    }

    document.body.addEventListener("pointermove", handlePointerMove, { capture: true })
    document.body.addEventListener("pointerup", handlePointerUp, { capture: true })
  }, [resizingTileId, row])

  const handleBottomRightPointerDown = useCallback((e: React.PointerEvent) => {
    rowTile && handleResizePointerDown(e, rowTile, "bottom-right")
  }, [handleResizePointerDown, rowTile])

  const handleBottomLeftPointerDown = useCallback((e: React.PointerEvent) => {
    rowTile && handleResizePointerDown(e, rowTile, "bottom-left")
  }, [handleResizePointerDown, rowTile])

  const handleRightPointerDown = useCallback((e: React.PointerEvent) => {
    rowTile && handleResizePointerDown(e, rowTile, "right")
  }, [handleResizePointerDown, rowTile])

  const handleBottomPointerDown = useCallback((e: React.PointerEvent) => {
    rowTile && handleResizePointerDown(e, rowTile, "bottom")
  }, [handleResizePointerDown, rowTile])

  const handleLeftPointerDown = useCallback((e: React.PointerEvent) => {
    rowTile && handleResizePointerDown(e, rowTile, "left")
  }, [handleResizePointerDown, rowTile])

  // const startStyleTop = top || 0
  // const startStyleLeft = left || 0
  // const movingStyle = transform && {top: startStyleTop + transform.y, left: startStyleLeft + transform.x,
  //   width, height, zIndex, transition: "none"}

  const info = getTileComponentInfo(tileType)
  const style = tileId === resizingTileId
                  ? resizingTileStyle
                  : rowTile?.isHidden && info?.renderWhenHidden
                    ? { left: -9999, top: -9999, width: 0, height: 0 }
                    : rowTile?.isMinimized
                      ? { left, top, transition: "none", width, height: kTitleBarHeight, zIndex }
                      : tileStyle
  // don't impose a width and height for fixed size components
  if (info?.isFixedWidth) delete style?.width
  if (info?.isFixedHeight) delete style?.height
  const disableAnimation = urlParams.noComponentAnimation !== undefined
  const classes = clsx("free-tile-component", {
    minimized: rowTile?.isMinimized,
    "disable-animation": disableAnimation })

  // The CSS transition used to animate the tile can cause child components to prematurely apply effects that depend on
  // the tile's dimensions. To prevent this, we add a transitionend handler that sets a flag on the tile model when the
  // transition completes. Child components can check this flag to avoid or counteract premature application of effects.
  useEffect(function addTransitionEndHandler() {
    // applyModelChange is used to prevent an action from being added to the undo stack
    const handleTransitionEnd = () => tile.applyModelChange(() => tile.setTransitionComplete(true))
    const element = document.getElementById(`${tileId}`)
    element?.addEventListener("transitionend", handleTransitionEnd)

    return () => element?.removeEventListener("transitionend", handleTransitionEnd)
  }, [tile, tileId])

  if (!info || (rowTile?.isHidden && !info.renderWhenHidden)) return null

  const { isFixedWidth, isFixedHeight } = info
  const { isMinimized } = rowTile || {}

  return (
    <ComponentWrapperContext.Provider value={componentRef}>
      <div id={tileId} className={classes} style={style} key={tileId} ref={componentRef}
          data-tile-z-index={zIndex}>
        {tile && rowTile &&
          <>
            <CodapComponent tile={tile}
              isMinimized={isMinimized}
              onMinimizeTile={handleMinimizeTile}
              onCloseTile={onCloseTile}
              onMoveTilePointerDown={handleMoveTilePointerDown}
            />
            {!isMinimized &&
              <>
                <Portal containerRef={containerRef}>
                  {!isFixedWidth &&
                    <ComponentResizeBorder edge="left" onPointerDown={handleLeftPointerDown}
                        componentRef={componentRef} containerRef={containerRef} />}
                  {!isFixedWidth &&
                    <ComponentResizeBorder edge="right" onPointerDown={handleRightPointerDown}
                        componentRef={componentRef} containerRef={containerRef} />}
                  {!isFixedHeight &&
                    <ComponentResizeBorder edge="bottom" onPointerDown={handleBottomPointerDown}
                        componentRef={componentRef} containerRef={containerRef} />}
                </Portal>
                {!(isFixedWidth && isFixedHeight) &&
                  <div className="codap-component-corner bottom-left" onPointerDown={handleBottomLeftPointerDown}/>
                }
                {!(isFixedWidth && isFixedHeight) &&
                  <div className="codap-component-corner bottom-right" onPointerDown={handleBottomRightPointerDown}>
                    {(uiState.isFocusedTile(tile.id)) &&
                      <ResizeHandle className="component-resize-handle"/>}
                  </div>
                }
              </>
            }
          </>
        }
      </div>
    </ComponentWrapperContext.Provider>
  )
})
