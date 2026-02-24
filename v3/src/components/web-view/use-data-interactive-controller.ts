import iframePhone from "iframe-phone"
import { reaction } from "mobx"
import React, { useEffect, useState } from "react"
import { setupRequestQueueProcessor } from "../../data-interactive/data-interactive-request-processor"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"
import { useCfmContext } from "../../hooks/use-cfm-context"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { ITileModel } from "../../models/tiles/tile-model"
import { gLocale } from "../../utilities/translation/locale"
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

  // Counter incremented when a localized plugin needs to reload due to a locale change.
  // Included in the useEffect deps so the iframePhone connection is torn down and
  // re-established after the iframe reloads, without mutating the persisted model URL.
  const [localeVersion, setLocaleVersion] = useState(0)

  // React to locale changes outside the main useEffect so that:
  // - Localized plugins: bump localeVersion to trigger useEffect re-run (the iframe src
  //   is recomputed by the observer in web-view.tsx using gLocale.current).
  // - Other plugins: send a localeChanged notification via the existing controller.
  useEffect(() => {
    const localeDisposer = reaction(
      () => gLocale.current,
      (lang) => {
        if (webViewModel?.needsLocaleReload) {
          setLocaleVersion(v => v + 1)
        } else if (webViewModel?.isPlugin) {
          webViewModel.broadcastMessage(
            { action: "notify", resource: "global", values: { operation: "localeChanged", lang } },
            () => debugLog(DEBUG_PLUGINS, "Reply to localeChanged notification")
          )
        }
      },
      { name: "DataInteractiveController locale change reaction" }
    )
    return () => localeDisposer()
  }, [webViewModel])

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
  }, [cfm, iframeRef, localeVersion, tile, url, webViewModel])
}
