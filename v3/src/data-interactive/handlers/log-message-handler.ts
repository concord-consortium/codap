import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diLogMessageHandler: DIHandler = {
  notify: diNotImplementedYet
}

registerDIHandler("logMessage", diLogMessageHandler)
