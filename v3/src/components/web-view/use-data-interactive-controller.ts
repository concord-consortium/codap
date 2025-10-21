import iframePhone from "iframe-phone"
import { reaction } from "mobx"
import React, { useEffect } from "react"
import { getDIHandler } from "../../data-interactive/data-interactive-handler"
import {
  DIAction, DIHandler, DIRequest, DIRequestCallback, DIRequestResponse, DIValues
} from "../../data-interactive/data-interactive-types"
import "../../data-interactive/register-handlers"
import { parseResourceSelector, resolveResources } from "../../data-interactive/resource-parser"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { t } from "../../utilities/translation/translate"
import { errorResult } from "../../data-interactive/handlers/di-results"
import { V2CaseTable } from "../../data-interactive/data-interactive-component-types"
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

            // We handle a special case for V2 compatibility: Request is for creating a caseTable
            // but there is no specified dataContext though there is specified a name.
            const handleCreateCaseTableWithoutDataContext = () => {
              const hasNameProperty = (value: DIValues | undefined): value is { name: string } => {
                return typeof value === "object" && value !== null && "name" in value
              }

              const isCreateCaseTableWithoutDataContext = (theAction: DIAction) => {

                const hasTypeProperty = (value: DIValues | undefined): value is { type: string } => {
                  return typeof value === "object" && value !== null && "type" in value
                }
                const hasDataContextProperty = (value: DIValues | undefined): value is { dataContext: string } => {
                  return typeof value === "object" && value !== null && "dataContext" in value
                }

                return theAction.action === 'create' &&
                  hasTypeProperty(theAction.values) && theAction.values.type === 'caseTable' &&
                  !hasDataContextProperty(theAction.values) && hasNameProperty(theAction.values)
              }
              if (isCreateCaseTableWithoutDataContext(action)) {
                if (hasNameProperty(action.values)) {
                  (action.values as V2CaseTable).dataContext = action.values.name
                }
              }
            }

            if (!action) return errorResult(t("V3.DI.Error.noAction"))
            if (!tile) return errorResult(t("V3.DI.Error.noTile"))

            handleCreateCaseTableWithoutDataContext()

            const resourceSelector = parseResourceSelector(action.resource)
            const resources = resolveResources(resourceSelector, action.action, tile)
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
  }, [iframeRef, tile, url, webViewModel])
}
