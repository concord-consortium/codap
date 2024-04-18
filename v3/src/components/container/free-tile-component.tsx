import { useDndContext } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useState } from "react"
import { getDragTileId, IUseDraggableTile, useDraggableTile } from "../../hooks/use-drag-drop"
import { IFreeTileLayout, IFreeTileRow, isFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { CodapComponent } from "../codap-component"
import { kTitleBarHeight } from "../constants"

interface IProps {
  row: IFreeTileRow;
  tile: ITileModel;
  onCloseTile: (tileId: string) => void;
}

export const FreeTileComponent = observer(function FreeTileComponent({ row, tile, onCloseTile}: IProps) {
  const [resizingTileStyle, setResizingTileStyle] =
    useState<{left: number, top: number, width?: number, height?: number, transition: string}>()
  const [resizingTileId, setResizingTileId] = useState("")
  const tileId = tile.id
  const tileType = tile.content.type
  const rowTile = row.tiles.get(tileId)
  const { x: left, y: top, width, height } = rowTile || {}
  const { active } = useDndContext()
  const tileStyle: React.CSSProperties = { left, top, width, height }
  const draggableOptions: IUseDraggableTile = { prefix: tileType || "tile", tileId }
  const {setNodeRef, transform} = useDraggableTile(draggableOptions,
    activeDrag => {
    const dragTileId = getDragTileId(activeDrag)
    if (dragTileId) {
      if (isFreeTileRow(row)) {
        row.moveTileToTop(dragTileId)
      }
    }
  })

  const handleMinimizeTile = useCallback(() => {
    rowTile?.setMinimized(!rowTile.isMinimized)
  }, [rowTile])

  const handleResizePointerDown = useCallback((e: React.PointerEvent, mtile: IFreeTileLayout, direction: string) => {
    const startWidth = mtile.width
    const startHeight = mtile.height
    const startPosition = {x: e.pageX, y: e.pageY}

    let resizingWidth = startWidth, resizingHeight = startHeight, resizingLeft = mtile.x
    // Because user can start drag 8px within the border, the component's startPosition.x moves by number of pixels
    // the pointer down event location, which moves the entire component to the right by the same number of pixels.
    // So we force it to always be the left position of the component
    // const startLeft = startPosition.x > tile.x ? tile.x : startPosition.x
    const startLeft = mtile.x

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      setResizingTileId(mtile.tileId)
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

      setResizingTileStyle({left: resizingLeft, top: mtile.y, width: resizingWidth, height: resizingHeight,
                              transition: "none"})
    }
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove, { capture: true })
      document.body.removeEventListener("pointerup", onPointerUp, { capture: true })
      mtile.setSize(resizingWidth, resizingHeight)
      mtile.setPosition(resizingLeft, mtile.y)
      setResizingTileId("")
    }

    document.body.addEventListener("pointermove", onPointerMove, { capture: true })
    document.body.addEventListener("pointerup", onPointerUp, { capture: true })
  }, [])

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
    width, height}
  const minimizedStyle = { left, top, width, height: kTitleBarHeight }
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
  const classes = clsx("free-tile-component", { minimized: rowTile?.isMinimized })

  if (!info || rowTile?.isHidden) return null

  return (
    <div className={classes} style={style} key={tileId} ref={setNodeRef}>
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
  )
})
