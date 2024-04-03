import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"

export const kDefaultSliderName = "v1"
export const kDefaultSliderValue = .5

export function valueChangeNotification(value: number, name?: string) {
  const action = "notify"
  const resource = `global[${name ?? ""}]`
  const values = { globalValue: value }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${resource}:`, JSON.stringify(response))
  }
}
