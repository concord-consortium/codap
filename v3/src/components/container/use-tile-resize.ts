import { KeyboardEvent, PointerEvent, useCallback, useRef } from "react"
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

// Builds an IChangingTileStyle from unscaled, already-clamped dimensions.
// Handles inbounds scaling for display before new dimensions get saved to the model.
const buildResizeDisplayStyle = (
  left: number, top: number, width?: number, height?: number, zIndex?: number
): IChangingTileStyle => {
  const { scaleFactor } = inBoundsScaling
  const inbounds = uiState.inboundsMode
  return {
    height: inbounds && height != null ? height * scaleFactor : height,
    left: inbounds ? left * scaleFactor : left,
    top: inbounds ? top * scaleFactor : top,
    transition: "none",
    width: inbounds && width != null ? width * scaleFactor : width,
    zIndex
  }
}

export function useTileResize({ row, tile, tileId, setChangingTileStyle }: IProps) {
  const containerRef = useDocumentContainerContext()

  // Commits a resize to the model as a single undoable action.
  // Used by both pointer-up and keyboard blur.
  const commitResize = useCallback((
    tileLayout: IFreeTileLayout, width?: number, height?: number, left?: number
  ) => {
    row.applyModelChange(() => {
      tileLayout.setSize(width, height)
      if (left != null) {
        tileLayout.setPosition(left, tileLayout.y)
      }
    }, {
      notify: () => updateTileNotification("resize", {}, tile),
      undoStringKey: "DG.Undo.componentResize",
      redoStringKey: "DG.Redo.componentResize",
      log: logMessageWithReplacement("Resized component: %@", { tileID: tileLayout.tileId })
    })
  }, [row, tile])

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

      const resizeStyle = buildResizeDisplayStyle(
        resizingLeft, startTop, clampedWidth, clampedHeight, tileLayout.zIndex
      )
      setChangingTileStyle(resizeStyle)
    }

    const handlePointerUp = () => {
      document.body.removeEventListener("pointermove", handlePointerMove, { capture: true })
      document.body.removeEventListener("pointerup", handlePointerUp, { capture: true })

      const newWidth = getSafeTileWidth(resizingWidth, tile.minWidth)
      const newHeight = resizingHeight != null ? getSafeTileHeight(resizingHeight) : undefined
      const leftChanged = direction.includes("left") ? resizingLeft : undefined
      commitResize(tileLayout, newWidth, newHeight, leftChanged)

      setChangingTileStyle(undefined)
    }

    document.body.addEventListener("pointermove", handlePointerMove, { capture: true })
    document.body.addEventListener("pointerup", handlePointerUp, { capture: true })
  }, [commitResize, containerRef, setChangingTileStyle, tile, tileId])

  // Accumulated keyboard resize state, persisted across keystrokes.
  // Model is only updated on blur.
  const keyboardResizeRef = useRef<{
    startWidth: number | undefined
    startHeight: number | undefined
    currentWidth: number | undefined
    currentHeight: number | undefined
    widthChanged: boolean
    heightChanged: boolean
  } | null>(null)

  const handleResizeFocus = useCallback(() => {
    uiState.setFocusedTile(tileId)

    const tileLayout: IFreeTileLayout | undefined = row.tiles.get(tileId)
    if (!tileLayout) return

    // Capture starting dimensions from the model.
    keyboardResizeRef.current = {
      startWidth: tileLayout.width,
      startHeight: tileLayout.height,
      currentWidth: tileLayout.width,
      currentHeight: tileLayout.height,
      widthChanged: false,
      heightChanged: false
    }
  }, [row, tileId])

  const handleResizeKeyDown = useCallback((e: KeyboardEvent) => {
    const tileLayout: IFreeTileLayout | undefined = row.tiles.get(tileId)
    const state = keyboardResizeRef.current
    if (!tileLayout || !state) return

    let { currentWidth, currentHeight } = state

    switch (e.key) {
      case "ArrowRight":
        if (tile.isResizable.width && currentWidth != null) {
          currentWidth = currentWidth + kResizeIncrement
          state.widthChanged = true
        }
        break
      case "ArrowLeft":
        if (tile.isResizable.width && currentWidth != null) {
          currentWidth = Math.max(currentWidth - kResizeIncrement, tile.minWidth)
          state.widthChanged = state.widthChanged || currentWidth !== state.currentWidth
        }
        break
      case "ArrowDown":
        if (tile.isResizable.height && currentHeight != null) {
          currentHeight = currentHeight + kResizeIncrement
          state.heightChanged = true
        }
        break
      case "ArrowUp":
        if (tile.isResizable.height && currentHeight != null) {
          currentHeight = Math.max(currentHeight - kResizeIncrement, kDefaultMinHeight)
          state.heightChanged = state.heightChanged || currentHeight !== state.currentHeight
        }
        break
      default:
        return  // don't prevent default for other keys
    }

    if (currentWidth === state.currentWidth && currentHeight === state.currentHeight) return

    e.preventDefault()

    state.currentWidth = currentWidth
    state.currentHeight = currentHeight

    // Apply inbounds constraints
    const { scaleFactor } = inBoundsScaling
    const componentInfo = getTileComponentInfo(tile.content.type)
    const hasInspector = !!componentInfo?.InspectorPanel
    const inspectorWidth = hasInspector ? kInspectorPanelWidth : 0

    if (uiState.inboundsMode) {
      const containerWidth = containerRef.current?.clientWidth ?? Infinity
      const containerHeight = containerRef.current?.clientHeight ?? Infinity

      if (currentWidth != null) {
        const maxWidth = (containerWidth - tileLayout.x * scaleFactor - inspectorWidth) / scaleFactor
        currentWidth = Math.min(currentWidth, maxWidth)
        state.currentWidth = currentWidth
      }
      if (currentHeight != null) {
        const maxHeight = (containerHeight - tileLayout.y * scaleFactor) / scaleFactor
        currentHeight = Math.min(currentHeight, maxHeight)
        state.currentHeight = currentHeight
      }
    }

    const clampedWidth = state.widthChanged ? getSafeTileWidth(currentWidth, tile.minWidth) : currentWidth
    const clampedHeight = currentHeight != null && state.heightChanged
      ? getSafeTileHeight(currentHeight)
      : currentHeight

    const resizeStyle = buildResizeDisplayStyle(
      tileLayout.x, tileLayout.y, clampedWidth, clampedHeight, tileLayout.zIndex
    )
    setChangingTileStyle(resizeStyle)
  }, [containerRef, row, setChangingTileStyle, tile, tileId])

  const handleResizeBlur = useCallback(() => {
    const tileLayout: IFreeTileLayout | undefined = row.tiles.get(tileId)
    const state = keyboardResizeRef.current
    if (!tileLayout || !state) return

    const { startWidth, startHeight, currentWidth, currentHeight, widthChanged, heightChanged } = state
    keyboardResizeRef.current = null
    setChangingTileStyle(undefined)

    if (!widthChanged && !heightChanged) return

    commitResize(
      tileLayout,
      widthChanged ? getSafeTileWidth(currentWidth, tile.minWidth) : startWidth,
      heightChanged ? getSafeTileHeight(currentHeight) : startHeight
    )
  }, [commitResize, row, setChangingTileStyle, tile, tileId])

  return { handleResizeBlur, handleResizeFocus, handleResizeKeyDown, handleResizePointerDown }
}
