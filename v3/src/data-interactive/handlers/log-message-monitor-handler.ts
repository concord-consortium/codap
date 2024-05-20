import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diLogMessageMonitorHandler: DIHandler = {
  register: diNotImplementedYet,
  unregister: diNotImplementedYet
}

registerDIHandler("logMessageMonitor", diLogMessageMonitorHandler)
