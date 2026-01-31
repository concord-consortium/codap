import iframePhone, { getIFrameEndpoint } from "iframe-phone"
import { IReactionDisposer } from "mobx"
import { RequestQueue } from "../../components/web-view/request-queue"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { setupRequestQueueProcessor } from "../../data-interactive/data-interactive-request-processor"
import { DIRequest, DIRequestCallback } from "../../data-interactive/data-interactive-types"
import { DEBUG_PLUGINS, debugLog } from "../debug"
import { registerEmbeddedModeHandler } from "./embedded-mode-registry"

export interface EmbeddedModeHandler {
  rpcEndpoint: iframePhone.IframePhoneRpcEndpoint
  isPhoneInUse: boolean
  broadcastMessage: (message: DIMessage, callback: (result: any) => void) => void
  disconnect: () => void
}

// Single handler for parent connection (only one parent possible)
let parentHandler: EmbeddedModeHandler | null = null

export function getEmbeddedModeHandler(): EmbeddedModeHandler | null {
  return parentHandler
}

/**
 * Initialize parent connection for embedded mode.
 * Creates an iframePhone RPC endpoint to communicate with the parent window.
 * Only initializes if CODAP is running in an iframe (window.parent !== window).
 */
export function initializeEmbeddedServer(): EmbeddedModeHandler | null {
  // Only initialize if running in an iframe
  if (window.parent === window) {
    debugLog(DEBUG_PLUGINS, "Not in iframe, skipping embedded server initialization")
    return null
  }

  // Don't initialize twice
  if (parentHandler) {
    debugLog(DEBUG_PLUGINS, "Embedded server already initialized")
    return parentHandler
  }

  debugLog(DEBUG_PLUGINS, "Initializing embedded server for parent communication")

  let isPhoneInUse = false
  let disposer: IReactionDisposer | null = null
  const requestQueue = new RequestQueue()

  const handler: iframePhone.IframePhoneRpcEndpointHandlerFn =
    (request: DIRequest, callback: DIRequestCallback) => {
      debugLog(DEBUG_PLUGINS, `Embedded server received: ${JSON.stringify(request)}`)
      isPhoneInUse = true
      requestQueue.push({ request, callback })
    }

  // Create the iframe endpoint for communication with parent
  const phone = getIFrameEndpoint()
  phone.initialize()

  const rpcEndpoint = new iframePhone.IframePhoneRpcEndpoint({
    namespace: "data-interactive",
    phone,
    handler
  } as iframePhone.IframePhoneRpcEndpointHandlerObj)

  // Send "codap-present" message to signal CODAP is ready
  rpcEndpoint.call({ message: "codap-present" }, (reply) => {
    debugLog(DEBUG_PLUGINS, `Embedded server codap-present reply: ${JSON.stringify(reply)}`)
  })

  // Set up request queue processor using shared module
  // Note: embedded server has no associated tile, so we don't pass one
  disposer = setupRequestQueueProcessor(requestQueue, {
    name: "EmbeddedServer request processor"
  })

  parentHandler = {
    rpcEndpoint,
    get isPhoneInUse() { return isPhoneInUse },
    broadcastMessage: (message: DIMessage, callback: (result: any) => void) => {
      rpcEndpoint.call(message, callback)
    },
    disconnect: () => {
      disposer?.()
      rpcEndpoint.disconnect()
      registerEmbeddedModeHandler(null)
      parentHandler = null
    }
  }

  // Register the handler so document-content can broadcast to it
  registerEmbeddedModeHandler(parentHandler)

  debugLog(DEBUG_PLUGINS, "Embedded server initialized successfully")
  return parentHandler
}
