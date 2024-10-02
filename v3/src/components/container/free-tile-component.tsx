import { useMergeRefs } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { PointerEvent, useCallback, useEffect, useRef, useState } from "react"
import { ComponentWrapperContext } from "../../hooks/use-component-wrapper-context"
import { getDragTileId, IUseDraggableTile, useDraggableTile } from "../../hooks/use-drag-drop"
import { IFreeTileLayout, IFreeTileRow, isFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { CodapComponent } from "../codap-component"
import { kTitleBarHeight } from "../constants"
import { urlParams } from "../../utilities/url-params"
import { logMessageWithReplacement } from "../../lib/log-message"

interface IProps {
  row: IFreeTileRow
  tile: ITileModel
  onCloseTile: (tileId: string) => void
}

export const FreeTileComponent = observer(function FreeTileComponent({ row, tile, onCloseTile}: IProps) {
  const { active } = useDndContext()
  const componentRef = useRef<HTMLDivElement | null>(null)
  const { id: tileId, content: { type: tileType } } = tile
  const [useDefaultCreationStyle, setUseDefaultCreationStyle] = useState(row.animateCreationTiles.has(tileId))
  const [resizingTileStyle, setResizingTileStyle] =
    useState<{left: number, top: number, width?: number, height?: number, zIndex?: number, transition: string}>()
  const [resizingTileId, setResizingTileId] = useState("")
  const rowTile = row.tiles.get(tileId)
  const { x: left, y: top, width, height, zIndex } = rowTile || {}
  // when animating creation, use the default creation style on the first render
  const tileStyle: React.CSSProperties = useDefaultCreationStyle
          ? { left: 0, top: 0, width: 0, height: kTitleBarHeight, zIndex }
          : { left, top, width, height, zIndex }
  const draggableOptions: IUseDraggableTile = { prefix: tileType || "tile", tileId }

  useEffect(() => {
    // after the first render, render the actual style; CSS transitions will handle the animation
    setUseDefaultCreationStyle(false)
  }, [])

  const {setNodeRef, transform} = useDraggableTile(draggableOptions,
    activeDrag => {
    const dragTileId = getDragTileId(activeDrag)
    if (dragTileId) {
      const draggedElement = document.getElementById(dragTileId)
      if (draggedElement) {
        // Capture pointer events for the dragged tile
        draggedElement.addEventListener('pointermove', (event) => {
          if (!draggedElement.hasPointerCapture(event.pointerId)) {
            draggedElement.setPointerCapture(event.pointerId)
          }
        })

        draggedElement.addEventListener('pointerup', (event) => {
          draggedElement.releasePointerCapture(event.pointerId)
        })
      }

      if (isFreeTileRow(row)) {
        const allowBringToFront = dragTileId === tile.id ? tile.content.allowBringToFront : true
        row.moveTileToTop(dragTileId, allowBringToFront)
      }
    }
  })
  const mergedComponentRef = useMergeRefs<HTMLDivElement | null>(componentRef, setNodeRef)

  const handleMinimizeTile = useCallback(() => {
    rowTile?.setMinimized(!rowTile.isMinimized)
  }, [rowTile])

  const handleResizePointerDown = useCallback((e: PointerEvent, tileLayout: IFreeTileLayout, direction: string) => {
    if (e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const startWidth = tileLayout.width
    const startHeight = tileLayout.height
    const startPosition = {x: e.pageX, y: e.pageY}

    let resizingWidth = startWidth, resizingHeight = startHeight, resizingLeft = tileLayout.x
    // Because user can start drag 8px within the border, the component's startPosition.x moves by number of pixels
    // the pointer down event location, which moves the entire component to the right by the same number of pixels.
    // So we force it to always be the left position of the component
    // const startLeft = startPosition.x > tile.x ? tile.x : startPosition.x
    const startLeft = tileLayout.x

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
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
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove, { capture: true })
      document.body.removeEventListener("pointerup", onPointerUp, { capture: true })
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

    document.body.addEventListener("pointermove", onPointerMove, { capture: true })
    document.body.addEventListener("pointerup", onPointerUp, { capture: true })
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

  const startStyleTop = top || 0
  const startStyleLeft = left || 0
  const movingStyle = transform && {top: startStyleTop + transform.y, left: startStyleLeft + transform.x,
    width, height, zIndex, transition: "none"}
  const minimizedStyle = { left, top, width, height: kTitleBarHeight, zIndex }
  const style = rowTile?.isMinimized
                  ? minimizedStyle
                  : tileId === resizingTileId
                    ? resizingTileStyle
                    : active && movingStyle
                        ? movingStyle
                        : tileStyle
  // don't impose a width and height for fixed size components
  const info = getTileComponentInfo(tileType)
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

  if (!info || rowTile?.isHidden) return null

  return (
    <ComponentWrapperContext.Provider value={componentRef}>
      <div id={tileId} className={classes} style={style} key={tileId} ref={mergedComponentRef}>
        {tile && rowTile &&
          <CodapComponent tile={tile}
            isMinimized={rowTile.isMinimized}
            onMinimizeTile={handleMinimizeTile}
            onCloseTile={onCloseTile}
            onBottomRightPointerDown={handleBottomRightPointerDown}
            onBottomLeftPointerDown={handleBottomLeftPointerDown}
            onRightPointerDown={handleRightPointerDown}
            onBottomPointerDown={handleBottomPointerDown}
            onLeftPointerDown={handleLeftPointerDown}
          />
        }
      </div>
    </ComponentWrapperContext.Provider>
  )
})
