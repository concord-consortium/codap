import { useToast } from "@chakra-ui/react"
import iframePhone from "iframe-phone"
import React, { useEffect } from "react"
import { ITileModel } from "../../models/tiles/tile-model"
import { isWebViewModel } from "./web-view-model"

function extractOrigin(url?: string) {
  if (!url) return
  const re = /([^:]*:\/\/[^/]*)/
  if (/^http.*/i.test(url)) {
    return re.exec(url)?.[1]
  }
}

export function useDataInteractiveController(iframeRef: React.MutableRefObject<null>, tile?: ITileModel) {
  const toast = useToast()
  const webViewModel = tile?.content
  const url = isWebViewModel(webViewModel) ? webViewModel.url : undefined

  useEffect(() => {
    console.log(`Establishing connection to ${iframeRef.current}`)
    if (iframeRef.current) {
      const originUrl = extractOrigin(url) ?? ""
      const phone = new iframePhone.ParentEndpoint(iframeRef.current, originUrl,
        () => console.log("connection with iframe established"))
      const handler: iframePhone.IframePhoneRpcEndpointHandlerFn = (content: any, callback: any) => {
        // console.log(`--- Received data-interactive: ${JSON.stringify(content)}`)
        toast({
          title: "Web view received message",
          description: JSON.stringify(content),
          status: "success",
          duration: 9000,
          isClosable: true
        })
        let result: any = { success: false }
        if (Array.isArray(content)) {
          result = content.map((action: any) => {
            if (action && action.resource === "interactiveFrame") {
              if (action.action === "update") {
                const values = action.values
                if (values.title) {
                  tile?.setTitle(values.title)
                  return { success: true }
                }
              } else if (action.action === "get") {
                return {
                  success: true,
                  values: {
                    name: tile?.title,
                    title: tile?.title,
                    version: "0.1",
                    preventBringToFront: false,
                    preventDataContextReorg: false,
                    dimensions: {
                      width: 600,
                      height: 500
                    },
                    externalUndoAvailable: true,
                    standaloneUndoModeAvailable: false
                  }
                }
              }
            }
            return { success: false }
          })
        }
        // console.log(` -- Responding with`, result)
        callback(result)
      }
      const rpcEndpoint = new iframePhone.IframePhoneRpcEndpoint(handler,
        "data-interactive", iframeRef.current, originUrl, phone)
      rpcEndpoint.call({message: "codap-present"} as any,
        reply => console.log(`Reply to codap-present: `, JSON.stringify(reply)))
    }
  }, [iframeRef, tile, toast, url])
}
