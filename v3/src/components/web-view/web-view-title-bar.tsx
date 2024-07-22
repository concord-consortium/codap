import { observer } from "mobx-react-lite"
import React from "react"
import { t } from "../../utilities/translation/translate"
import { ComponentTitleBar  } from "../component-title-bar"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { isWebViewModel } from "./web-view-model"

import "./web-view-title-bar.scss"

export const WebViewTitleBar = observer(function WebViewTitleBar({ tile, ...others }: ITileTitleBarProps) {
  const getTitle = () => tile?.title || t("DG.WebView.defaultTitle")
  const webView = isWebViewModel(tile?.content) ? tile.content : undefined
  const children = webView?.isPlugin ? <div className="plugin-version">{webView.version}</div> : null
  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others}>
      {children}
    </ComponentTitleBar>
  )
})
