import { observer } from "mobx-react-lite"
import { useRef } from "react"
import { t } from "../../utilities/translation/translate"
import { booleanParam, urlParams } from "../../utilities/url-params"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { useDataInteractiveController } from "./use-data-interactive-controller"
import { kWebViewBodyClass } from "./web-view-defs"
import { WebViewDropOverlay } from "./web-view-drop-overlay"
import { isWebViewModel } from "./web-view-model"

import "./web-view.scss"

export const WebViewComponent = observer(function WebViewComponent({ tile }: ITileBaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const webViewModel = tile?.content

  useDataInteractiveController(iframeRef, tile)

  if (!isWebViewModel(webViewModel)) return null

  const hideWebViewLoading = booleanParam(urlParams.hideWebViewLoading)

  return (
    <div className={kWebViewBodyClass} data-testid="codap-web-view">
      {!webViewModel.isPluginCommunicating && !hideWebViewLoading && (
        <div className="codap-web-view-backdrop">
          <div className="codap-web-view-url">{webViewModel.url}</div>
          <div className="codap-web-view-message">{t("DG.GameView.loadError")}</div>
        </div>
      )}
      <div className="codap-web-view-iframe-wrapper">
        { webViewModel.isImage
            ? <img className="codap-web-view-image" src={webViewModel.url} alt="Image" />
            : <iframe className="codap-web-view-iframe" ref={iframeRef} src={webViewModel.url} />
        }
      </div>
      <WebViewDropOverlay />
    </div>
  )
})
