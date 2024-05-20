import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diConfigurationListHandler: DIHandler = {
  get: diNotImplementedYet
}

registerDIHandler("configurationList", diConfigurationListHandler)
