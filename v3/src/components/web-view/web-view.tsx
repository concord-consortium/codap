import React from "react"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isWebViewModel } from "./web-view-model"

import "./web-view.scss"

export const WebViewComponent = ({ tile }: ITileBaseProps) => {
  const webViewModel = tile?.content
  if (!isWebViewModel(webViewModel)) return null

  return (
    <div className="codap-web-view" data-testid="codap-web-view">
      <iframe className="codap-web-view-iframe" src={webViewModel.url} />
    </div>
  )
}
