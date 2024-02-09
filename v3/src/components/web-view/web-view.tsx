import React from "react"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isWebViewModel } from "./web-view-model"

import "./web-view.scss"

export const WebViewComponent = ({ tile }: ITileBaseProps) => {
  const webViewModel = tile?.content
  if (!isWebViewModel(webViewModel)) return null

  return (
    <div className="codap-web-view-body" data-testid="codap-web-view">
      <div className="codap-web-view-backdrop">
        <div className="codap-web-view-url">URL</div>
        <div className="codap-web-view-message">Check that URL yall.</div>
      </div>
      <div className="codap-web-view-iframe-wrapper">
        <iframe className="codap-web-view-iframe" src={webViewModel.url} />
      </div>
    </div>
  )
}
