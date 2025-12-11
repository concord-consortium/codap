import iframePhone from "iframe-phone"
import { reaction } from "mobx"
import React, { useEffect } from "react"
import { isV2CaseTableComponent } from "../../data-interactive/data-interactive-component-types"
import { getDIHandler } from "../../data-interactive/data-interactive-handler"
import { errorResult } from "../../data-interactive/handlers/di-results"
import {
  DIAction, DIHandler, DIRequest, DIRequestCallback, DIRequestResponse
} from "../../data-interactive/data-interactive-types"
import { parseResourceSelector, resolveResources } from "../../data-interactive/resource-parser"
import { useCfmContext } from "../../hooks/use-cfm-context"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { t } from "../../utilities/translation/translate"
import { RequestQueue } from "./request-queue"
import { isWebViewModel } from "./web-view-model"

import "../../data-interactive/register-handlers"

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
      rpcEndpoint.call({message: "codap-present"},
        reply => debugLog(DEBUG_PLUGINS, `Reply to codap-present: `, JSON.stringify(reply)))
      webViewModel?.setDataInteractiveController(rpcEndpoint)
      webViewModel?.applyModelChange(() => {}, {
                                      log: {message: "WebView initialized", args:{ url }, category: "plugin"},
                                      noDirty: true
                                    })

      // A reaction is used here instead of an autorun so properties accessed by each handler are not
      // observed. We only want to run the loop when a new request comes in, not when something changes
      // that a handler accessed.
      const disposer = reaction(() => {
        return {
          canProcessRequest: !uiState.isEditingBlockingCell,
          queueLength: requestQueue.length
        }
      },
      ({ canProcessRequest, queueLength }) => {
        if (!canProcessRequest || queueLength === 0) return

        uiState.captureEditingStateBeforeInterruption()
        let tableModified = false

        requestQueue.processItems(async ({ request, callback }) => {
          debugLog(DEBUG_PLUGINS, `Processing data-interactive: ${JSON.stringify(request)}`)
          let result: DIRequestResponse = { success: false }

          const processAction = async (action: DIAction) => {
            if (!action) return errorResult(t("V3.DI.Error.noAction"))
            if (!tile) return errorResult(t("V3.DI.Error.noTile"))

            const { action: _action, values } = action

            // We handle a special case for V2 compatibility: Request is for creating a caseTable
            // but there is no specified dataContext though there is a specified name.
            if (_action === "create" && isV2CaseTableComponent(values) && !values.dataContext && values.name) {
              values.dataContext = values.name
            }

            const resourceSelector = parseResourceSelector(action.resource)
            const resources = resolveResources(resourceSelector, action.action, tile, cfm)
            const type = resourceSelector.type ?? ""
            const a = action.action
            const func = getDIHandler(type)?.[a as keyof DIHandler]
            if (!func) return errorResult(t("V3.DI.Error.unsupportedAction", {vars: [a, type]}))

            const actionResult = await func?.(resources, action.values)
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
            result = []
            for (const action of request) {
              result.push(await processAction(action))
            }
          } else {
            result = await processAction(request)
          }

          debugLog(DEBUG_PLUGINS, `Responding with`, result)
          callback(result)
        })

        // TODO Only increment if a table may have changed
        // - many actions and resources could be ignored
        // - could specify which dataContext has been updated
        if (tableModified) uiState.incrementInterruptionCount()

      }, { name: "DataInteractiveController request processor autorun" })

      return () => {
        disposer()
        rpcEndpoint.disconnect()
        phone.disconnect()
      }
    }
  }, [cfm, iframeRef, tile, url, webViewModel])
}
