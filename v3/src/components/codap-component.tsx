import { observer } from "mobx-react-lite"
import React from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { ITileBaseProps, ITileTitleBarProps } from "./tiles/tile-base-props"
import { ITileModel } from "../models/tiles/tile-model"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  TitleBar: React.ComponentType<ITileTitleBarProps>;
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
  onCloseTile: (tileId: string) => void
  onBottomRightPointerDown?: (e: React.PointerEvent) => void
  onBottomLeftPointerDown?: (e: React.PointerEvent) => void
  onRightPointerDown?: (e: React.PointerEvent) => void
  onBottomPointerDown?: (e: React.PointerEvent) => void
  onLeftPointerDown?: (e: React.PointerEvent) => void
}

export const CodapComponent =
    observer(({ tile, TitleBar, Component, tileEltClass, onCloseTile, onBottomRightPointerDown, onBottomLeftPointerDown,
      onRightPointerDown, onBottomPointerDown, onLeftPointerDown }: IProps) => {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`}>
        <TitleBar tile={tile} onCloseTile={onCloseTile}/>
        <Component tile={tile} />
        {onRightPointerDown && <div className="codap-component-border right" onPointerDown={onRightPointerDown}/>}
        {onBottomPointerDown && <div className="codap-component-border bottom" onPointerDown={onBottomPointerDown}/>}
        {onLeftPointerDown && <div className="codap-component-border left" onPointerDown={onLeftPointerDown}/>}
        {onBottomLeftPointerDown &&
          <div className="codap-component-corner bottom-left" onPointerDown={onBottomLeftPointerDown}/>
        }
        {onBottomRightPointerDown &&
          <div className="codap-component-corner bottom-right" onPointerDown={onBottomRightPointerDown}>
            <ResizeHandle className="component-resize-handle"/>
          </div>
        }
      </div>
    </DataSetContext.Provider>
  )
})
