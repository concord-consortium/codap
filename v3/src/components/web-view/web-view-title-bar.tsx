import React from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { getTitle } from "../../models/tiles/tile-content-info"

export const WebViewTitleBar = observer(function WebViewTitleBar({ tile, ...others }: ITileTitleBarProps) {
  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle(tile)} {...others} />
  )
})
