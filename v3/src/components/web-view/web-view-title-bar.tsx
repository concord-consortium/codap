import React from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"

export const WebViewTitleBar = observer(function WebViewTitleBar({ tile, ...others }: ITileTitleBarProps) {
  const tileContentInfo = getTileContentInfo(tile?.content.type)
  const getTitle = () => {
    return tile ? tileContentInfo?.getTitle?.(tile) : undefined
  }

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others} />
  )
})
