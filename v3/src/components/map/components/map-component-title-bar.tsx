import React from "react"
import { ComponentTitleBar } from "../../component-title-bar"
import { observer } from "mobx-react-lite"
import { ITileTitleBarProps } from "../../tiles/tile-base-props"
import { getTitle } from "../../../models/tiles/tile-content-info"

export const MapComponentTitleBar = observer(function MapComponentTitleBar(props: ITileTitleBarProps) {
  const {tile, ...others} = props

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle(tile)} {...others} />
  )
})
