import { KeyboardEvent, PointerEvent, useCallback } from "react"
import { useDocumentContainerContext } from "../../hooks/use-document-container-context"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { inBoundsScaling } from "../../models/document/inbounds-scaling"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { kDefaultMinHeight, kDefaultMinWidth } from "../../models/tiles/tile-layout"
import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { uiState } from "../../models/ui-state"
import { kInspectorPanelWidth } from "../../utilities/inbounds-utils"
import { IChangingTileStyle } from "../constants"

interface IProps {
  row: IFreeTileRow
  tile: ITileModel
  tileId: string
  setChangingTileStyle: (style: Maybe<IChangingTileStyle>) => void
}

const kResizeIncrement = 20  // pixels per arrow keypress

const getSafeTileWidth = (width?: number, minWidth = kDefaultMinWidth) => {
  return width != null ? Math.max(width, minWidth) : minWidth
}

const getSafeTileHeight = (height?: number, minHeight = kDefaultMinHeight) => {
  return height != null ? Math.max(height, minHeight) : minHeight
}

export function useTileResize({ row, tile, tileId, setChangingTileStyle }: IProps) {
  const containerRef = useDocumentContainerContext()

  const handleResizePointerDown = useCallback((e: PointerEvent, tileLayout: IFreeTileLayout, direction: string) => {
    uiState.setFocusedTile(tileId)

    if (e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    const startWidth = tileLayout.width
    const startHeight = tileLayout.height
    const startPosition = { x: e.pageX, y: e.pageY }
    const startLeft = tileLayout.x
    const startTop = tileLayout.y

    let resizingWidth = startWidth
    let resizingHeight = startHeight
    let resizingLeft = startLeft

    // Get inbounds constraints
    const { scaleFactor } = inBoundsScaling
    const componentInfo = getTileComponentInfo(tile.content.type)
    const hasInspector = !!componentInfo?.InspectorPanel
    const inspectorWidth = hasInspector ? kInspectorPanelWidth : 0
    const containerWidth = containerRef.current?.clientWidth ?? Infinity
    const containerHeight = containerRef.current?.clientHeight ?? Infinity

    const handlePointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      const xDelta = pointerMoveEvent.pageX - startPosition.x
      const yDelta = pointerMoveEvent.pageY - startPosition.y
      const addIfDefined = (x: number | undefined, delta: number) => x != null ? x + delta : x

      if (direction.includes("left")) {
        resizingWidth = addIfDefined(startWidth, -xDelta)
        resizingLeft = startLeft + xDelta

        // In inbounds mode, prevent left edge from going negative
        if (uiState.inboundsMode) {
          const scaledLeft = resizingLeft * scaleFactor
          if (scaledLeft < 0) {
            resizingLeft = 0
            resizingWidth = startWidth != null ? startLeft + startWidth : startWidth
          }
        }
      }
      if (direction.includes("bottom")) {
        resizingHeight = addIfDefined(startHeight, yDelta)

        // In inbounds mode, constrain height to container
        if (uiState.inboundsMode && resizingHeight != null) {
          const scaledTop = startTop * scaleFactor
          const maxHeight = (containerHeight - scaledTop) / scaleFactor
          resizingHeight = Math.min(resizingHeight, maxHeight)
        }
      }
      if (direction.includes("right")) {
        resizingWidth = addIfDefined(startWidth, xDelta)

        // In inbounds mode, constrain width to container
        if (uiState.inboundsMode && resizingWidth != null) {
          const scaledLeft = resizingLeft * scaleFactor
          const maxWidth = (containerWidth - scaledLeft - inspectorWidth) / scaleFactor
          resizingWidth = Math.min(resizingWidth, maxWidth)
        }
      }

      const clampedWidth = getSafeTileWidth(resizingWidth, tile.minWidth)
      const clampedHeight = resizingHeight != null ? getSafeTileHeight(resizingHeight) : resizingHeight

      // Compute display values (scaled if in inbounds mode)
      const displayLeft = uiState.inboundsMode ? resizingLeft * scaleFactor : resizingLeft
      const displayTop = uiState.inboundsMode ? startTop * scaleFactor : startTop
      const displayWidth = uiState.inboundsMode
        ? clampedWidth * scaleFactor
        : clampedWidth
      const displayHeight = uiState.inboundsMode && clampedHeight != null
        ? clampedHeight * scaleFactor
        : clampedHeight

      setChangingTileStyle({
        left: displayLeft,
        top: displayTop,
        width: displayWidth,
        height: displayHeight,
        zIndex: tileLayout.zIndex,
        transition: "none"
      })
    }

    const handlePointerUp = () => {
      const newWidth = getSafeTileWidth(resizingWidth, tile.minWidth)
      const newHeight = resizingHeight != null ? getSafeTileHeight(resizingHeight) : undefined
      document.body.removeEventListener("pointermove", handlePointerMove, { capture: true })
      document.body.removeEventListener("pointerup", handlePointerUp, { capture: true })

      row.applyModelChange(() => {
        // Store unscaled values in the model (they're already unscaled since we constrain in unscaled space)
        tileLayout.setSize(newWidth, newHeight)
        tileLayout.setPosition(resizingLeft, tileLayout.y)
      }, {
        notify: () => updateTileNotification("resize", {}, tile),
        undoStringKey: "DG.Undo.componentResize",
        redoStringKey: "DG.Redo.componentResize",
        log: logMessageWithReplacement("Resized component: %@", { tileID: tileLayout.tileId })
      })

      setChangingTileStyle(undefined)
    }

    document.body.addEventListener("pointermove", handlePointerMove, { capture: true })
    document.body.addEventListener("pointerup", handlePointerUp, { capture: true })
  }, [containerRef, row, setChangingTileStyle, tile, tileId])

  const handleResizeFocus = useCallback(() => {
    uiState.setFocusedTile(tileId)
  }, [tileId])

  const handleResizeKeyDown = useCallback((e: KeyboardEvent) => {
    const tileLayout: IFreeTileLayout | undefined = row.tiles.get(tileId)
    if (!tileLayout) return

    const { width, height } = tileLayout
    let newWidth = width
    let newHeight = height
    let widthChanged = false
    let heightChanged = false

    switch (e.key) {
      case "ArrowRight":
        if (tile.isResizable.width && newWidth != null) {
          newWidth = newWidth + kResizeIncrement
          widthChanged = true
        }
        break
      case "ArrowLeft":
        if (tile.isResizable.width && newWidth != null) {
          newWidth = Math.max(newWidth - kResizeIncrement, tile.minWidth)
          widthChanged = newWidth !== width
        }
        break
      case "ArrowDown":
        if (tile.isResizable.height && newHeight != null) {
          newHeight = newHeight + kResizeIncrement
          heightChanged = true
        }
        break
      case "ArrowUp":
        if (tile.isResizable.height && newHeight != null) {
          newHeight = Math.max(newHeight - kResizeIncrement, kDefaultMinHeight)
          heightChanged = newHeight !== height
        }
        break
      default:
        return  // don't prevent default for other keys
    }

    if (!widthChanged && !heightChanged) return

    e.preventDefault()

    // Apply inbounds constraints
    if (uiState.inboundsMode) {
      const { scaleFactor } = inBoundsScaling
      const containerWidth = containerRef.current?.clientWidth ?? Infinity
      const containerHeight = containerRef.current?.clientHeight ?? Infinity
      const componentInfo = getTileComponentInfo(tile.content.type)
      const hasInspector = !!componentInfo?.InspectorPanel
      const inspectorWidth = hasInspector ? kInspectorPanelWidth : 0

      if (widthChanged && newWidth != null) {
        const maxWidth = (containerWidth - tileLayout.x * scaleFactor - inspectorWidth) / scaleFactor
        newWidth = Math.min(newWidth, maxWidth)
      }
      if (heightChanged && newHeight != null) {
        const maxHeight = (containerHeight - tileLayout.y * scaleFactor) / scaleFactor
        newHeight = Math.min(newHeight, maxHeight)
      }
    }

    row.applyModelChange(() => {
      tileLayout.setSize(
        widthChanged ? getSafeTileWidth(newWidth, tile.minWidth) : width,
        heightChanged ? getSafeTileHeight(newHeight) : height
      )
    }, {
      notify: () => updateTileNotification("resize", {}, tile),
      undoStringKey: "DG.Undo.componentResize",
      redoStringKey: "DG.Redo.componentResize",
      log: logMessageWithReplacement("Resized component: %@", { tileID: tileLayout.tileId })
    })
  }, [containerRef, row, tile, tileId])

  return { handleResizeFocus, handleResizeKeyDown, handleResizePointerDown }
}
