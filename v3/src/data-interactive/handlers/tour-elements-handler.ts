import { ITourElement, tourElements } from "../../lib/tour/tour-elements"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler } from "../data-interactive-types"

let cachedRegistry: Record<string, ITourElement> | null = null

function flattenRegistry(): Record<string, ITourElement> {
  if (cachedRegistry) return cachedRegistry
  cachedRegistry = {}
  for (const [ns, elements] of Object.entries(tourElements)) {
    for (const [name, element] of Object.entries(elements)) {
      cachedRegistry[`${ns}.${name}`] = element
    }
  }
  return cachedRegistry
}

export const diTourElementsHandler: DIHandler = {
  get() {
    return { success: true, values: flattenRegistry() as any }
  }
}

registerDIHandler("tourElements", diTourElementsHandler)
