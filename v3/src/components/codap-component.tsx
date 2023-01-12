import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { EditableComponentTitle } from "./editable-component-title"
import { ITileBaseProps } from "./tiles/tile-base-props"
import { ITileModel } from "../models/tiles/tile-model"

import "./codap-component.scss"

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
}
export const CodapComponent = observer(({ tile, Component, tileEltClass }: IProps) => {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last
  const [componentTitle, setComponentTitle] = useState("")

  const handleTitleChange = (title?: string) => {
    title && setComponentTitle(title)
  }

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`}>
        <EditableComponentTitle componentTitle={componentTitle} onEndEdit={handleTitleChange} />
        <Component tile={tile} />
      </div>
    </DataSetContext.Provider>
  )
})
