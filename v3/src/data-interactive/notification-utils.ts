import { DEBUG_PLUGINS, debugLog } from "../lib/debug"

const action = "notify"

export const makeCallback = (operation: string, other?: any) => {
  return (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation} ${other ?? ""}`, JSON.stringify(response))
}

export const notification = (resource: string, values: any, _callback?: (result: any) => void) => {
  const callback = _callback ?? makeCallback(values.operation)
  return { message: { action, resource, values }, callback }
}
