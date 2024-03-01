import { useToast } from "@chakra-ui/react"
import iframePhone from "iframe-phone"
import React, { useEffect } from "react"
import { getDIHandler } from "../../data-interactive/data-interactive-handler"
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
      const handler: iframePhone.IframePhoneRpcEndpointHandlerFn = (content: any, callback: any) => {
        debugLog(DEBUG_PLUGINS, `--- Received data-interactive: ${JSON.stringify(content)}`)
        toast({
          title: "Web view received message",
          description: JSON.stringify(content),
          status: "success",
          duration: 9000,
          isClosable: true
        })
        let result: any = { success: false }

        const processAction = (action: any) => {
          if (action && tile) {
            const resourceSelector = parseResourceSelector(action.resource)
            const resources = resolveResources(resourceSelector, action.action, tile)
            const h = getDIHandler(resourceSelector.type ?? "")
            const a = action.action
            const func = a === "get" ? h?.get
              : a === "update" ? h?.update : h?.create
            return func?.(resources)
          }
          return { success: false }
        }
        if (Array.isArray(content)) {
          result = content.map((action: any) => processAction(action))
        } else {
          result = processAction(content)
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
