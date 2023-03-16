import { observer } from "mobx-react-lite"
import React from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { ITileBaseProps, ITileTitleBarProps } from "./tiles/tile-base-props"
import { ITileModel } from "../models/tiles/tile-model"
import { uiState } from "../models/ui-state"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  TitleBar: React.ComponentType<ITileTitleBarProps>;
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
  isUserResizable?: boolean;
  onCloseTile: (tileId: string) => void
  onBottomRightPointerDown?: (e: React.PointerEvent) => void
  onBottomLeftPointerDown?: (e: React.PointerEvent) => void
  onRightPointerDown?: (e: React.PointerEvent) => void
  onBottomPointerDown?: (e: React.PointerEvent) => void
  onLeftPointerDown?: (e: React.PointerEvent) => void
}

export const CodapComponent = observer(function CodapComponent({
  tile, TitleBar, Component, tileEltClass,isUserResizable, onCloseTile, onBottomRightPointerDown,
  onBottomLeftPointerDown, onBottomPointerDown, onLeftPointerDown, onRightPointerDown
}: IProps) {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last
  function handleFocusTile() {
    uiState.setFocusedTile(tile.id)
  }

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`} key={tile.id}
        onFocus={handleFocusTile} onPointerDownCapture={handleFocusTile}>
        <TitleBar tile={tile} onCloseTile={onCloseTile}/>
        <Component tile={tile} />
        {onRightPointerDown && isUserResizable &&
          <div className="codap-component-border right" onPointerDown={onRightPointerDown}/>}
        {onBottomPointerDown && isUserResizable &&
          <div className="codap-component-border bottom" onPointerDown={onBottomPointerDown}/>}
        {onLeftPointerDown && isUserResizable &&
          <div className="codap-component-border left" onPointerDown={onLeftPointerDown}/>}
        {onBottomLeftPointerDown && isUserResizable &&
          <div className="codap-component-corner bottom-left" onPointerDown={onBottomLeftPointerDown}/>
        }
        {onBottomRightPointerDown && isUserResizable &&
          <div className="codap-component-corner bottom-right" onPointerDown={onBottomRightPointerDown}>
            {uiState.isFocusedTile(tile.id) &&
              <ResizeHandle className="component-resize-handle"/>}
          </div>
        }
      </div>
    </DataSetContext.Provider>
  )
})
