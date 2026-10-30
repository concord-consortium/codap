import { comparer, reaction } from "mobx"
import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"
import { IGlobalValueManager } from "./global-value-manager"

// Built inline rather than with notification() so the plugin API doc extractor can read it.
export function globalValueNotification(value: number, name?: string) {
  const action = "notify"
  const resource = `global[${name ?? ""}]`
  const values = { globalValue: value }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${resource}:`, JSON.stringify(response))
  }
}

type GlobalValueNotification = ReturnType<typeof globalValueNotification>

let suppressNotifications = false

// Changes made while `fn` runs send no notification, e.g. when `update document` replaces the
// document state, which V2 did by rebuilding the document rather than by changing its values.
export function withoutGlobalValueNotifications<T>(fn: () => T): T {
  const prevSuppress = suppressNotifications
  suppressNotifications = true
  try {
    return fn()
  } finally {
    suppressNotifications = prevSuppress
  }
}

// As in V2 (global_value_model.js:43-52), every change to a global value notifies every plugin with
// `global[<name>]`, whatever made the change: a slider drag or animation, a plugin's `update global`,
// or undo/redo. Setting a global to its current value, and adding, removing or renaming a global, send
// nothing. The notification goes out when the outermost action ends, so it follows any notifications
// sent by the action that made the change. Returns a disposer.
export function observeGlobalValueChanges(
  getManager: () => IGlobalValueManager | undefined,
  broadcast: (message: GlobalValueNotification["message"], callback: GlobalValueNotification["callback"]) => void
) {
  let priorValues = new Map<string, number>()
  return reaction(
    () => Array.from(getManager()?.globals.values() ?? []).map(({ id, name, value }) => ({ id, name, value })),
    globals => {
      if (!suppressNotifications) {
        globals.forEach(({ id, name, value }) => {
          const priorValue = priorValues.get(id)
          if (priorValue != null && priorValue !== value) {
            const { message, callback } = globalValueNotification(value, name)
            broadcast(message, callback)
          }
        })
      }
      priorValues = new Map(globals.map(({ id, value }) => [id, value]))
    },
    { name: "observeGlobalValueChanges", equals: comparer.structural, fireImmediately: true }
  )
}
