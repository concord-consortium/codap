import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import { t } from "../../utilities/translation/translate"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { useDataInteractiveController } from "./use-data-interactive-controller"
import { isWebViewModel } from "./web-view-model"

import "./web-view.scss"

export const WebViewComponent = observer(function WebViewComponent({ tile }: ITileBaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const webViewModel = tile?.content

  useDataInteractiveController(iframeRef, tile)

  if (!isWebViewModel(webViewModel)) return null

  return (
    <div className="codap-web-view-body" data-testid="codap-web-view">
      {!webViewModel.isPlugin && (
        <div className="codap-web-view-backdrop">
          <div className="codap-web-view-url">{webViewModel.url}</div>
          <div className="codap-web-view-message">{t("DG.GameView.loadError")}</div>
        </div>
      )}
      <div className="codap-web-view-iframe-wrapper">
        <iframe className="codap-web-view-iframe" ref={iframeRef} src={webViewModel.url} />
      </div>
    </div>
  )
})
