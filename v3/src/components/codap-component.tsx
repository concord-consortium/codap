import { observer } from "mobx-react-lite"
import React from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { ITileBaseProps } from "./tiles/tile-base-props"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  onCloseTile: (tileId: string) => void
  onBottomRightPointerDown?: (e: React.PointerEvent) => void
  onBottomLeftPointerDown?: (e: React.PointerEvent) => void
  onRightPointerDown?: (e: React.PointerEvent) => void
  onBottomPointerDown?: (e: React.PointerEvent) => void
  onLeftPointerDown?: (e: React.PointerEvent) => void
}

export const CodapComponent = observer(function CodapComponent({
  tile, onCloseTile, onLeftPointerDown, onBottomPointerDown, onRightPointerDown,
  onBottomLeftPointerDown, onBottomRightPointerDown
}: IProps) {
  const info = getTileComponentInfo(tile.content.type)
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last
  function handleFocusTile() {
    uiState.setFocusedTile(tile.id)
  }

  if (!info) return null

  const { TitleBar, Component, InspectorPanel, tileEltClass, isFixedWidth, isFixedHeight } = info
  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`} key={tile.id}
        onFocus={handleFocusTile} onPointerDownCapture={handleFocusTile}>
        <TitleBar tile={tile} onCloseTile={onCloseTile}/>
        <Component tile={tile} />
        {onRightPointerDown && !isFixedWidth &&
          <div className="codap-component-border right" onPointerDown={onRightPointerDown}/>}
        {onBottomPointerDown && !isFixedHeight &&
          <div className="codap-component-border bottom" onPointerDown={onBottomPointerDown}/>}
        {onLeftPointerDown && !isFixedWidth &&
          <div className="codap-component-border left" onPointerDown={onLeftPointerDown}/>}
        {onBottomLeftPointerDown && !(isFixedWidth && isFixedHeight) &&
          <div className="codap-component-corner bottom-left" onPointerDown={onBottomLeftPointerDown}/>
        }
        {onBottomRightPointerDown && !(isFixedWidth && isFixedHeight) &&
          <div className="codap-component-corner bottom-right" onPointerDown={onBottomRightPointerDown}>
            {uiState.isFocusedTile(tile.id) &&
              <ResizeHandle className="component-resize-handle"/>}
          </div>
        }
      </div>
      {InspectorPanel && <InspectorPanel tile={tile} show={uiState.isFocusedTile(tile?.id)}/>}
    </DataSetContext.Provider>
  )
})
