import iframePhone from "iframe-phone"
import React, { useEffect } from "react"
import { setupRequestQueueProcessor } from "../../data-interactive/data-interactive-request-processor"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"
import { useCfmContext } from "../../hooks/use-cfm-context"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { ITileModel } from "../../models/tiles/tile-model"
import { RequestQueue } from "./request-queue"
import { isWebViewModel } from "./web-view-model"

function extractOrigin(url?: string) {
  if (!url) return
  // TODO It would probably be better to confirm that the url is legal before trying to create a URL from it
  try {
    return new URL(url).origin
  } catch (e) {
    debugLog(DEBUG_PLUGINS, `Could not determine origin from illegal url:`, url)
  }
}

export function useDataInteractiveController(iframeRef: React.RefObject<HTMLIFrameElement>, tile?: ITileModel) {
  const tileContentModel = tile?.content
  const webViewModel = isWebViewModel(tileContentModel) ? tileContentModel : undefined
  const url = webViewModel?.url
  const cfm = useCfmContext()

  useEffect(() => {
    debugLog(DEBUG_PLUGINS, `Establishing connection to ${iframeRef.current}`)
    if (iframeRef.current) {
      const requestQueue = new RequestQueue()
      const originUrl = extractOrigin(url) ?? ""
      const phone = new iframePhone.ParentEndpoint(iframeRef.current, originUrl,
        () => {
          webViewModel?.setPluginIsCommunicating()
          debugLog(DEBUG_PLUGINS, "connection with iframe established")
        })
      const handler: iframePhone.IframePhoneRpcEndpointHandlerFn =
        (request: DIRequest, callback: DIRequestCallback) =>
      {
        debugLog(DEBUG_PLUGINS, `Received data-interactive: ${JSON.stringify(request)}`)
        requestQueue.push({ request, callback })
      }
      const rpcEndpoint = new iframePhone.IframePhoneRpcEndpoint(handler,
        "data-interactive", iframeRef.current, originUrl, phone)
      rpcEndpoint.call({message: "codap-present"},
        reply => debugLog(DEBUG_PLUGINS, `Reply to codap-present: `, JSON.stringify(reply)))
      webViewModel?.setDataInteractiveController(rpcEndpoint)
      webViewModel?.applyModelChange(() => {}, {
                                      log: {message: "WebView initialized", args:{ url }, category: "plugin"},
                                      noDirty: true
                                    })

      // Set up request queue processor using shared module
      const disposer = setupRequestQueueProcessor(requestQueue, {
        tile,
        cfm,
        name: "DataInteractiveController request processor"
      })

      return () => {
        disposer()
        rpcEndpoint.disconnect()
        phone.disconnect()
      }
    }
  }, [cfm, iframeRef, tile, url, webViewModel])
}
