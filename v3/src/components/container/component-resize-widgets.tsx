import { Portal } from "@chakra-ui/react"
import React, { useCallback, useEffect } from "react"
import ResizeHandle from "../../assets/icons/icon-corner-resize-handle.svg"
import { useTileContainerContext } from "../../hooks/use-tile-container-context"
import { IFreeTileLayout } from "../../models/document/free-tile-row"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { ComponentResizeBorder } from "../component-resize-border"
import { useForceUpdate } from "../../hooks/use-force-update"

interface IProps {
  tile: ITileModel
  tileLayout?: IFreeTileLayout
  componentRef: React.RefObject<HTMLDivElement | null>
  isFixedWidth?: boolean
  isFixedHeight?: boolean
  handleResizePointerDown: (e: React.PointerEvent, _tileLayout: IFreeTileLayout, direction: string) => void
}
export function ComponentResizeWidgets(props: IProps) {
  const { tile, tileLayout, componentRef, isFixedWidth, isFixedHeight, handleResizePointerDown } = props
  const containerRef = useTileContainerContext()
  const forceUpdate = useForceUpdate()

  const handleBottomRightPointerDown = useCallback((e: React.PointerEvent) => {
    tileLayout && handleResizePointerDown(e, tileLayout, "bottom-right")
  }, [handleResizePointerDown, tileLayout])

  const handleBottomLeftPointerDown = useCallback((e: React.PointerEvent) => {
    tileLayout && handleResizePointerDown(e, tileLayout, "bottom-left")
  }, [handleResizePointerDown, tileLayout])

  const handleRightPointerDown = useCallback((e: React.PointerEvent) => {
    tileLayout && handleResizePointerDown(e, tileLayout, "right")
  }, [handleResizePointerDown, tileLayout])

  const handleBottomPointerDown = useCallback((e: React.PointerEvent) => {
    tileLayout && handleResizePointerDown(e, tileLayout, "bottom")
  }, [handleResizePointerDown, tileLayout])

  const handleLeftPointerDown = useCallback((e: React.PointerEvent) => {
    tileLayout && handleResizePointerDown(e, tileLayout, "left")
  }, [handleResizePointerDown, tileLayout])

  useEffect(() => {
    // trigger an initial re-render to ensure resize widgets are positioned correctly
    forceUpdate()
  }, [forceUpdate])

  return (
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
  )
}
