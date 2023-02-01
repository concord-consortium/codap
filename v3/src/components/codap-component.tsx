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
}

export const CodapComponent = observer(({ tile, TitleBar, Component, tileEltClass, onCloseTile }: IProps) => {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`}>
        <TitleBar tile={tile} onCloseTile={onCloseTile}/>
        <Component tile={tile} />
        <ResizeHandle className="component-resize-handle"/>
      </div>
    </DataSetContext.Provider>
  )
})
