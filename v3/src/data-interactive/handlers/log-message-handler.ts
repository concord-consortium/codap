import { LoggableObject, LoggableValue, logMessageWithReplacement } from "../../lib/log-message"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DILogMessage, DIResources, DIValues } from "../data-interactive-types"
import { logMonitorManager, LogEventInfo } from "../log-monitor-manager"
import { valuesRequiredResult } from "./di-results"

export const diLogMessageHandler: DIHandler = {
  notify(resources: DIResources, values?: DIValues) {
    const webviewModel = resources.interactiveFrame?.content
    if (values) {
      const { formatStr, replaceArgs, topic } = values as DILogMessage
      const message = formatStr ?? ""
      const argsArray = replaceArgs != null
        ? Array.isArray(replaceArgs) ? replaceArgs : [replaceArgs]
        : undefined
      const args: LoggableObject = {}
      argsArray?.forEach((value: LoggableValue, index: number) => {
        args[index.toString()] = value
      })
      const logMessage = logMessageWithReplacement(message, args)
      webviewModel?.applyModelChange(() => {},
        { noDirty: true, log: logMessage }
      )

      // Evaluate against registered log monitors
      const eventInfo: LogEventInfo = {
        message: logMessage.message,
        formatStr: message,
        topic,
        replaceArgs: argsArray
      }
      logMonitorManager.evaluateLogEvent(eventInfo)

      return { success: true }
    } else {
      return valuesRequiredResult
    }
  }
}

registerDIHandler("logMessage", diLogMessageHandler)
