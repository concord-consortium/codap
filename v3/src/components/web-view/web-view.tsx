import { useToast } from "@chakra-ui/react"
import iframePhone from "iframe-phone"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isWebViewModel } from "./web-view-model"
import { t } from "../../utilities/translation/translate"

import "./web-view.scss"

function extractOrigin(url?: string) {
  if (!url) return
  const re = /([^:]*:\/\/[^/]*)/
  if (/^http.*/i.test(url)) {
    return re.exec(url)?.[1]
  }
}

export const WebViewComponent = observer(function WebViewComponent({ tile }: ITileBaseProps) {
  const iframeRef = useRef(null)
  const webViewModel = tile?.content
  const toast = useToast()

  const url = isWebViewModel(webViewModel) ? webViewModel.url : undefined
  useEffect(() => {
    console.log(`Establishing connection to ${iframeRef.current}`)
    if (iframeRef.current) {
      const originUrl = extractOrigin(url) ?? ""
      const phone = new iframePhone.ParentEndpoint(iframeRef.current, originUrl,
        () => console.log("connection with iframe established"))
      const handler: iframePhone.IframePhoneRpcEndpointHandlerFn = (content: any, callback: any) => {
        console.log(`--- Received data-interactive: ${JSON.stringify(content)}`)
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
        console.log(` -- Responding with`, result)
        callback(result)
      }
      const rpcEndpoint = new iframePhone.IframePhoneRpcEndpoint(handler,
        "data-interactive", iframeRef.current, originUrl, phone)
      rpcEndpoint.call({message: "codap-present"} as any,
        reply => console.log(`Reply to codap-present: `, JSON.stringify(reply)))
    }
  }, [tile, toast, url])

  if (!isWebViewModel(webViewModel)) return null


  return (
    <div className="codap-web-view-body" data-testid="codap-web-view">
      <div className="codap-web-view-backdrop">
        <div className="codap-web-view-url">{webViewModel.url}</div>
        <div className="codap-web-view-message">{t("DG.GameView.loadError")}</div>
      </div>
      <div className="codap-web-view-iframe-wrapper">
        <iframe className="codap-web-view-iframe" ref={iframeRef} src={webViewModel.url} />
      </div>
    </div>
  )
})
