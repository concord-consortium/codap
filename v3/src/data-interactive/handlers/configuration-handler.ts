import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diConfigurationHandler: DIHandler = {
  get: diNotImplementedYet,
  update: diNotImplementedYet
}

registerDIHandler("configuration", diConfigurationHandler)
