import { useToast } from "@chakra-ui/react"
import iframePhone from "iframe-phone"
import React, { useEffect } from "react"
import { getDIHandler } from "../../data-interactive/data-interactive-handler"
import { DIAction, DIRequest, DIRequestResponse } from "../../data-interactive/data-interactive-types"
import { parseResourceSelector, resolveResources } from "../../data-interactive/resource-parser"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { ITileModel } from "../../models/tiles/tile-model"
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
  const toast = useToast()
  const webViewModel = tile?.content
  const url = isWebViewModel(webViewModel) ? webViewModel.url : undefined

  useEffect(() => {
    debugLog(DEBUG_PLUGINS, `Establishing connection to ${iframeRef.current}`)
    if (iframeRef.current) {
      const originUrl = extractOrigin(url) ?? ""
      const phone = new iframePhone.ParentEndpoint(iframeRef.current, originUrl,
        () => debugLog(DEBUG_PLUGINS, "connection with iframe established"))
      const handler: iframePhone.IframePhoneRpcEndpointHandlerFn =
        (request: DIRequest, callback: (returnValue: DIRequestResponse) => void) =>
      {
        debugLog(DEBUG_PLUGINS, `--- Received data-interactive: ${JSON.stringify(request)}`)
        toast({
          title: "Web view received message",
          description: JSON.stringify(request),
          status: "success",
          duration: 9000,
          isClosable: true
        })
        let result: DIRequestResponse = { success: false }

        const errorResult = (error: string) => ({ success: false, values: { error }} as const)
        const processAction = (action: DIAction) => {
          if (!action) return errorResult("No action to process.")
          if (!tile) return errorResult("No tile for action.")

          const resourceSelector = parseResourceSelector(action.resource)
          const resources = resolveResources(resourceSelector, action.action, tile)
          const type = resourceSelector.type ?? ""
          const h = getDIHandler(type)
          const a = action.action
          const func = a === "get" ? h?.get
            : a === "update" ? h?.update
            : a === "create" ? h?.create
            : a === "delete" ? h?.delete
            : a === "notify" ? h?.notify
            : undefined
          if (!func) return errorResult(`Unsupported action: ${a}/${type}`)

          return func?.(resources, action.values) ?? errorResult("Action handler returned undefined.")
        }
        if (Array.isArray(request)) {
          result = request.map(action => processAction(action))
        } else {
          result = processAction(request)
        }

        debugLog(DEBUG_PLUGINS, ` -- Responding with`, result)
        callback(result)
      }
      const rpcEndpoint = new iframePhone.IframePhoneRpcEndpoint(handler,
        "data-interactive", iframeRef.current, originUrl, phone)
      rpcEndpoint.call({message: "codap-present"} as any,
        reply => debugLog(DEBUG_PLUGINS, `Reply to codap-present: `, JSON.stringify(reply)))
    }
  }, [iframeRef, tile, toast, url])
}
