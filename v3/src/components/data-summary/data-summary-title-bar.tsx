import React from "react"
import { ComponentTitleBar } from "../component-title-bar"
import { observer } from "mobx-react-lite"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { gDataBroker } from "../../models/data/data-broker"

export const DataSummaryTitleBar = observer(function DataSummaryTitleBar({tile, onCloseTile}: ITileTitleBarProps) {
  const getTitle = () => gDataBroker.selectedDataSet?.name

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} onCloseTile={onCloseTile} />
  )
})
