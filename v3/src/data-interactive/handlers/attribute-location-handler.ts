import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diAttributeLocationHandler: DIHandler = {
  update: diNotImplementedYet
}

registerDIHandler("attributeLocation", diAttributeLocationHandler)
