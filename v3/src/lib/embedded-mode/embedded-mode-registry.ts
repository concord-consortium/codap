import { DIMessage } from "../../data-interactive/iframe-phone-types"

/**
 * Interface for embedded mode handler.
 * This is defined separately to avoid circular dependencies.
 */
export interface IEmbeddedModeHandler {
  isPhoneInUse: boolean
  broadcastMessage: (message: DIMessage, callback: (result: any) => void) => void
}

/**
 * Registry for embedded mode handlers.
 * This module has minimal imports to avoid circular dependencies.
 * The embedded-server module registers handlers here, and document-content queries it.
 */
let registeredHandler: IEmbeddedModeHandler | null = null

export function registerEmbeddedModeHandler(handler: IEmbeddedModeHandler | null) {
  registeredHandler = handler
}

export function getRegisteredEmbeddedModeHandler(): IEmbeddedModeHandler | null {
  return registeredHandler
}
