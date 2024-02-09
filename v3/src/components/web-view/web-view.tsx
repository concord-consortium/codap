import React from "react"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isWebViewModel } from "./web-view-model"
import t from "../../utilities/translation/translate"

import "./web-view.scss"

export const WebViewComponent = ({ tile }: ITileBaseProps) => {
  const webViewModel = tile?.content
  if (!isWebViewModel(webViewModel)) return null

  return (
    <div className="codap-web-view-body" data-testid="codap-web-view">
      <div className="codap-web-view-backdrop">
        <div className="codap-web-view-url">{webViewModel.url}</div>
        <div className="codap-web-view-message">{t("DG.GameView.loadError")}</div>
      </div>
      <div className="codap-web-view-iframe-wrapper">
        <iframe className="codap-web-view-iframe" src={webViewModel.url} />
      </div>
    </div>
  )
}
