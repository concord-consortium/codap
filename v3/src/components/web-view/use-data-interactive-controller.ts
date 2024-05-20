import iframePhone from "iframe-phone"
import React, { useEffect } from "react"
import { getDIHandler } from "../../data-interactive/data-interactive-handler"
import { DIAction, DIHandler, DIRequest, DIRequestResponse } from "../../data-interactive/data-interactive-types"
import "../../data-interactive/register-handlers"
import { parseResourceSelector, resolveResources } from "../../data-interactive/resource-parser"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { ITileModel } from "../../models/tiles/tile-model"
import { t } from "../../utilities/translation/translate"
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

  useEffect(() => {
    debugLog(DEBUG_PLUGINS, `Establishing connection to ${iframeRef.current}`)
    if (iframeRef.current) {
      const originUrl = extractOrigin(url) ?? ""
      const phone = new iframePhone.ParentEndpoint(iframeRef.current, originUrl,
        () => {
          webViewModel?.setIsPlugin(true)
          debugLog(DEBUG_PLUGINS, "connection with iframe established")
        })
      const handler: iframePhone.IframePhoneRpcEndpointHandlerFn =
        (request: DIRequest, callback: (returnValue: DIRequestResponse) => void) =>
      {
        debugLog(DEBUG_PLUGINS, `Received data-interactive: ${JSON.stringify(request)}`)
        let result: DIRequestResponse = { success: false }

        const errorResult = (error: string) => ({ success: false, values: { error }} as const)
        const processAction = (action: DIAction) => {
          if (!action) return errorResult(t("V3.DI.Error.noAction"))
          if (!tile) return errorResult(t("V3.DI.Error.noTile"))

          const resourceSelector = parseResourceSelector(action.resource)
          const resources = resolveResources(resourceSelector, action.action, tile)
          const type = resourceSelector.type ?? ""
          const a = action.action
          const func = getDIHandler(type)?.[a as keyof DIHandler]
          if (!func) return errorResult(t("V3.DI.Error.unsupportedAction", {vars: [a, type]}))

          return func?.(resources, action.values) ?? errorResult(t("V3.DI.Error.undefinedResponse"))
        }
        if (Array.isArray(request)) {
          result = request.map(action => processAction(action))
        } else {
          result = processAction(request)
        }

        debugLog(DEBUG_PLUGINS, `Responding with`, result)
        callback(result)
      }
      const rpcEndpoint = new iframePhone.IframePhoneRpcEndpoint(handler,
        "data-interactive", iframeRef.current, originUrl, phone)
      rpcEndpoint.call({message: "codap-present"} as any,
        reply => debugLog(DEBUG_PLUGINS, `Reply to codap-present: `, JSON.stringify(reply)))
      webViewModel?.setDataInteractiveController(rpcEndpoint)
      
      return () => {
        rpcEndpoint.disconnect()
        phone.disconnect()
      }
    }
  }, [iframeRef, tile, url, webViewModel])
}
