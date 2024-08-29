import { LoggableObject, logMessageWithReplacement } from "../../lib/log-message"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DILogMessage, DIResources, DIValues,  } from "../data-interactive-types"

export const diLogMessageHandler: DIHandler = {
  notify(resources: DIResources, values?: DIValues) {
    const webviewModel = resources.interactiveFrame?.content
    const {formatStr, replaceArgs} = values as DILogMessage
    const message = formatStr ?? ""
    const argsArray = replaceArgs != null
      ? Array.isArray(replaceArgs) ? replaceArgs : [replaceArgs]
      : undefined
    const args: LoggableObject = {}
    argsArray?.forEach((value: any, index: number) => {
      args[index.toString()] = value
    })
    webviewModel?.applyModelChange(()=>{},
      { log: logMessageWithReplacement(message, args)}
    )
    return {success: true}
  }
}

registerDIHandler("logMessage", diLogMessageHandler)
