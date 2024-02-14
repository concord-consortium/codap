import React from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import t from "../../utilities/translation/translate"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

export const WebViewTitleBar = observer(function WebViewTitleBar({ tile, ...others }: ITileTitleBarProps) {
  const getTitle = () => tile?.title || t("DG.WebView.defaultTitle")
  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others} />
  )
})
