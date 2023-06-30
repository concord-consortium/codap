import React from "react"
import { ComponentTitleBar } from "../../component-title-bar"
import { observer } from "mobx-react-lite"
import { ITileTitleBarProps } from "../../tiles/tile-base-props"
import {isGraphContentModel} from "../models/graph-content-model"

export const GraphComponentTitleBar = observer(function GraphComponentTitleBar(props: ITileTitleBarProps) {
  const {tile, ...others} = props
  const data = isGraphContentModel(tile?.content) ? tile?.content.dataset : undefined
  const getTitle = () => tile?.title || data?.name

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others} />
  )
})
