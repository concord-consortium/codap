import iframePhone from "iframe-phone"
import { autorun } from "mobx"
import React, { useEffect } from "react"
import { getDIHandler } from "../../data-interactive/data-interactive-handler"
import {
  DIAction, DIHandler, DIRequest, DIRequestCallback, DIRequestResponse
} from "../../data-interactive/data-interactive-types"
import "../../data-interactive/register-handlers"
import { parseResourceSelector, resolveResources } from "../../data-interactive/resource-parser"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { t } from "../../utilities/translation/translate"
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

  useEffect(() => {
    debugLog(DEBUG_PLUGINS, `Establishing connection to ${iframeRef.current}`)
    if (iframeRef.current) {
      const requestQueue = new RequestQueue()
      const originUrl = extractOrigin(url) ?? ""
      const phone = new iframePhone.ParentEndpoint(iframeRef.current, originUrl,
        () => {
          webViewModel?.setSubType("plugin")
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
      rpcEndpoint.call({message: "codap-present"} as any,
        reply => debugLog(DEBUG_PLUGINS, `Reply to codap-present: `, JSON.stringify(reply)))
      webViewModel?.setDataInteractiveController(rpcEndpoint)
      webViewModel?.applyModelChange(() => {}, {log: {message: "Plugin initialized", args:{}, category: "plugin"}})

      const disposer = autorun(() => {
        const canProcessRequest = !uiState.isEditingBlockingCell
        if (canProcessRequest && requestQueue.length > 0) {
          uiState.captureEditingStateBeforeInterruption()
          let tableModified = false
          while (requestQueue.length > 0) {
            const { request, callback } = requestQueue.nextItem
            debugLog(DEBUG_PLUGINS, `Processing data-interactive: ${JSON.stringify(request)}`)
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

              const actionResult = func?.(resources, action.values)
              if (actionResult &&
                ["create", "delete", "notify"].includes(a) &&
                !["component", "global", "interactiveFrame"].includes(type)
              ) {
                // Increment request batches processed if a table may have been modified
                tableModified = true
              }
              return actionResult ?? errorResult(t("V3.DI.Error.undefinedResponse"))
            }
            if (Array.isArray(request)) {
              result = request.map(action => processAction(action))
            } else {
              result = processAction(request)
            }

            debugLog(DEBUG_PLUGINS, `Responding with`, result)
            callback(result)
            requestQueue.shift()
          }
          // TODO Only increment if a table may have changed
          // - many actions and resources could be ignored
          // - could specify which dataContext has been updated
          if (tableModified) uiState.incrementInterruptionCount()
        }
      }, { name: "DataInteractiveController request processor autorun" })

      return () => {
        disposer()
        rpcEndpoint.disconnect()
        phone.disconnect()
      }
    }
  }, [iframeRef, tile, url, webViewModel])
}
