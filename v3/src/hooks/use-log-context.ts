import { DEBUG_LOGGER, debugLog } from "../lib/debug"
import { ILogMessage } from "../models/history/apply-model-change"

const gPendingLogMessages = new Map<string, ILogMessage>()

function getPendingLogMessage(key: string) {
  debugLog(DEBUG_LOGGER, "in getPendingLogMessage key", key)
  const message = gPendingLogMessages.get(key)
  gPendingLogMessages.delete(key)
  return message
}

function setPendingLogMessage(key: string, message: ILogMessage) {
  debugLog(DEBUG_LOGGER, "in setPendingLogMessage key", key)
  gPendingLogMessages.set(key, message)
}


export function useLoggingContext() {
  return { getPendingLogMessage, setPendingLogMessage }
}
