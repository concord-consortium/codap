import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { PointerEvent, useCallback, useEffect, useRef, useState } from "react"
import { ComponentWrapperContext } from "../../hooks/use-component-wrapper-context"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { urlParams } from "../../utilities/url-params"
import { CodapComponent } from "../codap-component"
import { IChangingTileStyle, kTitleBarHeight } from "../constants"
import { ComponentResizeWidgets } from "./component-resize-widgets"
import { useTileDrag } from "./use-tile-drag"

interface IProps {
  row: IFreeTileRow
  tile: ITileModel
  onCloseTile: (tileId: string) => void
}

export const FreeTileComponent = observer(function FreeTileComponent({ row, tile, onCloseTile}: IProps) {
  const componentRef = useRef<HTMLDivElement | null>(null)
  const { id: tileId, content: { type: tileType } } = tile
  const [useDefaultCreationStyle, setUseDefaultCreationStyle] = useState(row.animateCreationTiles.has(tileId))
  const [changingTileStyle, setChangingTileStyle] = useState<Maybe<IChangingTileStyle>>()
  const tileLayout: Maybe<IFreeTileLayout> = row.tiles.get(tileId)
  const { position: { x: left, y: top }, width, height, zIndex } = tileLayout || { position: { x: 0, y: 0 } }
  // when animating creation, use the default creation style on the first render
  const tileStyle: React.CSSProperties = useDefaultCreationStyle
          ? { left: 0, top: 0, width: 0, height: kTitleBarHeight, zIndex }
          : { left, top, width, height, zIndex }

  useEffect(() => {
    // after the first render, render the actual style; CSS transitions will handle the animation
    setUseDefaultCreationStyle(false)
  }, [])

  const handleMinimizeTile = useCallback(() => {
    tileLayout?.setMinimized(!tileLayout.isMinimized)
  }, [tileLayout])

  const { handlePointerDown: handleMoveTilePointerDown } = useTileDrag({ row, tile, tileLayout, setChangingTileStyle })

  const handleResizePointerDown = useCallback((e: PointerEvent, _tileLayout: IFreeTileLayout, direction: string) => {
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
        left: resizingLeft, top: _tileLayout.y,
        width: resizingWidth, height: resizingHeight,
        zIndex: _tileLayout.zIndex,
        transition: "none"
      })
    }
    const handlePointerUp = () => {
      document.body.removeEventListener("pointermove", handlePointerMove, { capture: true })
      document.body.removeEventListener("pointerup", handlePointerUp, { capture: true })
      row.applyModelChange(() => {
        _tileLayout.setSize(resizingWidth, resizingHeight)
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
  }, [row, tile])

  const info = getTileComponentInfo(tileType)
  const style = changingTileStyle ??
                  (tileLayout?.isHidden && info?.renderWhenHidden
                    ? { left: -9999, top: -9999, width: 0, height: 0 }
                    : tileLayout?.isMinimized
                      ? { left, top, transition: "none", width, height: kTitleBarHeight, zIndex }
                      : tileStyle)
  // don't impose a width and height for fixed size components
  if (info?.isFixedWidth) delete style?.width
  if (info?.isFixedHeight) delete style?.height
  const disableAnimation = urlParams.noComponentAnimation !== undefined
  const classes = clsx("free-tile-component", {
    minimized: tileLayout?.isMinimized,
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

  if (!info || (tileLayout?.isHidden && !info.renderWhenHidden)) return null

  const { isFixedWidth, isFixedHeight } = info
  const { isMinimized } = tileLayout || {}

  return (
    <ComponentWrapperContext.Provider value={componentRef}>
      <div id={tileId} className={classes} style={style} key={tileId} ref={componentRef}
          data-tile-z-index={zIndex}>
        {tile && tileLayout &&
          <>
            <CodapComponent tile={tile}
              isMinimized={isMinimized}
              onMinimizeTile={handleMinimizeTile}
              onCloseTile={onCloseTile}
              onMoveTilePointerDown={handleMoveTilePointerDown}
            />
            {!isMinimized &&
              <ComponentResizeWidgets tile={tile} tileLayout={tileLayout} componentRef={componentRef}
                isFixedWidth={isFixedWidth} isFixedHeight={isFixedHeight}
                handleResizePointerDown={handleResizePointerDown} />
            }
          </>
        }
      </div>
    </ComponentWrapperContext.Provider>
  )
})
