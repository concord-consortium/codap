import { DIAsyncHandler, DIHandler } from "./data-interactive-types"

const diHandlers: Map<string, DIHandler | DIAsyncHandler> = new Map()

export function registerDIHandler(resource: string, handler: DIHandler | DIAsyncHandler) {
  diHandlers.set(resource, handler)
}

export function getDIHandler(resource: string) {
  return diHandlers.get(resource)
}
