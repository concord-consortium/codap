import React from "react"
import { ComponentTitleBar } from "../../component-title-bar"
import { observer } from "mobx-react-lite"
import { ITileTitleBarProps } from "../../tiles/tile-base-props"
import { getTileContentInfo } from "../../../models/tiles/tile-content-info"

export const GraphComponentTitleBar = observer(function GraphComponentTitleBar(props: ITileTitleBarProps) {
  const {tile, ...others} = props
  const tileContentInfo = getTileContentInfo(tile?.content.type)
  const getTitle = () => {
    return tile && tileContentInfo?.getTitle ? tileContentInfo.getTitle(tile) : undefined
  }

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others} />
  )
})
