import { observer } from "mobx-react-lite"
import React from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { ITileBaseProps } from "./tiles/tile-base-props"
import { ITileModel } from "../models/tiles/tile-model"
import { ComponentHeader } from "./component-header"
import ResizeHandle from "../assets/icons/icon-corner-resize-handle.svg"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
  onCloseTile: (tileId: string) => void
}
export const CodapComponent = observer(({ tile, Component, tileEltClass, onCloseTile }: IProps) => {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`}>
        <ComponentHeader tileId={tile.id} tileType={tileEltClass} datasetName={dataset?.name}
            onCloseTile={onCloseTile}/>
        <Component tile={tile} />
        <ResizeHandle className="component-resize-handle"/>
      </div>
    </DataSetContext.Provider>
  )
})
