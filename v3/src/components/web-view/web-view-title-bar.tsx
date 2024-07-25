import { observer } from "mobx-react-lite"
import React from "react"
import { ComponentTitleBar  } from "../component-title-bar"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { getTitle } from "../../models/tiles/tile-content-info"
import { isWebViewModel } from "./web-view-model"

import "./web-view-title-bar.scss"

export const WebViewTitleBar = observer(function WebViewTitleBar({ tile, ...others }: ITileTitleBarProps) {
  const webView = isWebViewModel(tile?.content) ? tile.content : undefined
  const children = webView?.isPlugin ? <div className="plugin-version">{webView.version}</div> : null
  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle(tile)} {...others}>
      {children}
    </ComponentTitleBar>
  )
})
