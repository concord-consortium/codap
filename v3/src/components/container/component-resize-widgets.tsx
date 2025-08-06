import { Portal } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useCallback } from "react"
import ResizeHandle from "../../assets/icons/icon-corner-resize-handle.svg"
import { useFreeTileLayoutContext } from "../../hooks/use-free-tile-layout-context"
import { useTileContainerContext } from "../../hooks/use-tile-container-context"
import { IFreeTileLayout } from "../../models/document/free-tile-row"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { ComponentResizeBorder } from "../component-resize-border"

interface IProps {
  tile: ITileModel
  componentRef: React.RefObject<HTMLDivElement | null>
  isFixedWidth?: boolean
  isFixedHeight?: boolean
  handleResizePointerDown: (e: React.PointerEvent, _tileLayout: IFreeTileLayout, direction: string) => void
}
export const ComponentResizeWidgets = observer(function ComponentResizeWidgets(props: IProps) {
  const { tile, componentRef, isFixedWidth, isFixedHeight, handleResizePointerDown } = props
  const tileLayout = useFreeTileLayoutContext()
  const containerRef = useTileContainerContext()

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

  return (
    <>
      <Portal containerRef={containerRef}>
        {!isFixedWidth &&
          <ComponentResizeBorder edge="left" onPointerDown={handleLeftPointerDown} componentRef={componentRef} />}
        {!isFixedWidth &&
          <ComponentResizeBorder edge="right" onPointerDown={handleRightPointerDown} componentRef={componentRef} />}
        {!isFixedHeight &&
          <ComponentResizeBorder edge="bottom" onPointerDown={handleBottomPointerDown} componentRef={componentRef} />}
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
})
