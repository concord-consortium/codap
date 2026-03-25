import { ITourStep } from "./tour-types"
import { ITourElement } from "./tour-elements"

/** Create a tour step from an element registry entry, with optional overrides */
export function step(element: ITourElement, overrides?: { title?: string, description?: string }): ITourStep {
  return {
    element: element.selector,
    popover: {
      title: overrides?.title ?? element.title,
      description: overrides?.description ?? element.description,
    }
  }
}
