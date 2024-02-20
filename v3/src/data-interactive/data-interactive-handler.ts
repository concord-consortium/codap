import { DIHandler } from "./data-interactive-types"

const diHandlers: Map<string, DIHandler> = new Map()

export function registerDiHandler(resource: string, handler: DIHandler) {
  diHandlers.set(resource, handler)
}

export function getDiHandler(resource: string) {
  return diHandlers.get(resource)
}
