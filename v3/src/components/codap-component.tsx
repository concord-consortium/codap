import { observer } from "mobx-react-lite"
import React from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { ITileBaseProps } from "./tiles/tile-base-props"
import { ITileModel } from "../models/tiles/tile-model"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  TitleBar: React.ComponentType<ITileBaseProps>;
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
}
export const CodapComponent = observer(({ tile, TitleBar, Component, tileEltClass }: IProps) => {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`}>
        <TitleBar tile={tile}/>
        <Component tile={tile} />
        <ResizeHandle className="component-resize-handle"/>
      </div>
    </DataSetContext.Provider>
  )
})
