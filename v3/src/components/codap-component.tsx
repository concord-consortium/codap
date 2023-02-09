import { observer } from "mobx-react-lite"
import React from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { ITileBaseProps } from "./tiles/tile-base-props"
import { ITileModel } from "../models/tiles/tile-model"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"

import "./codap-component.scss"

const kMinComponentSize = 50,
      kMaxComponentSize = Number.MAX_VALUE

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  TitleBar: React.ComponentType<ITileBaseProps>;
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
  onPointerDown: (e: React.PointerEvent) => void
}
export const CodapComponent = observer(({ tile, TitleBar, Component, tileEltClass, onPointerDown }: IProps) => {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`}>
        <TitleBar tile={tile}/>
        <Component tile={tile} />
        <div className="resize-handle-wrapper" onPointerDown={onPointerDown}>
          <ResizeHandle className="component-resize-handle"/>
        </div>
        <div className="codap-component-border right" ref={setBorderElt}onPointerMove={handleBorderResizeRight}/>
        <div className="codap-component-border bottom" />
        <div className="codap-component-border left" onPointerMove={handleBorderResizeLeft}/>
        <div className="codap-component-corner bottom-left" />
        <div className="codap-component-border bottom-rightf" />
      </div>
    </DataSetContext.Provider>
  )
})
