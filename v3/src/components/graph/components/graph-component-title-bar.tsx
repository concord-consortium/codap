import React from "react"
import { isGraphModel } from "../models/graph-model"
import { ComponentTitleBar } from "../../component-title-bar"
import { observer } from "mobx-react-lite"
import { ITileTitleBarProps } from "../../tiles/tile-base-props"

export const GraphComponentTitleBar = observer(function GraphComponentTitleBar({tile, onCloseTile}: ITileTitleBarProps) {
  const data = isGraphModel(tile?.content) ? tile?.content.data : undefined
  const getTitle = () => tile?.title || data?.name

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} onCloseTile={onCloseTile} />
  )
})
