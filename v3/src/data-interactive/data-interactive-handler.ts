import { DIHandler } from "./data-interactive-types"

const diHandlers: Map<string, DIHandler> = new Map()

export function registerDIHandler(resource: string, handler: DIHandler) {
  diHandlers.set(resource, handler)
}

export function getDIHandler(resource: string) {
  return diHandlers.get(resource)
}
