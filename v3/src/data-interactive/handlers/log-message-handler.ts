import { LoggableObject, LoggableValue, logMessageWithReplacement } from "../../lib/log-message"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DILogMessage, DIResources, DIValues,  } from "../data-interactive-types"
import { valuesRequiredResult } from "./di-results"

export const diLogMessageHandler: DIHandler = {
  notify(resources: DIResources, values?: DIValues) {
    const webviewModel = resources.interactiveFrame?.content
    if (values) {
      const {formatStr, replaceArgs} = values as DILogMessage
      const message = formatStr ?? ""
      const argsArray = replaceArgs != null
        ? Array.isArray(replaceArgs) ? replaceArgs : [replaceArgs]
        : undefined
      const args: LoggableObject = {}
      argsArray?.forEach((value: LoggableValue, index: number) => {
        args[index.toString()] = value
      })
      webviewModel?.applyModelChange(()=>{},
        { noDirty: true, log: logMessageWithReplacement(message, args) }
      )
      return {success: true}
    } else {
      return valuesRequiredResult
    }
  }
}

registerDIHandler("logMessage", diLogMessageHandler)
