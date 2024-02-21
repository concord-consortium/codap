const debug = (window.localStorage ? window.localStorage.getItem("debug") : undefined) || ""
if (debug.length > 0) {
  // eslint-disable-next-line no-console
  console.info("DEBUG:", debug)
}

const debugContains = (key: string) => debug.indexOf(key) !== -1

export const DEBUG_CANVAS = debugContains("canvas")
export const DEBUG_DOCUMENT = debugContains("document")
export const DEBUG_FORMULAS = debugContains("formulas")
export const DEBUG_HISTORY = debugContains("history")
export const DEBUG_LISTENERS = debugContains("listeners")
export const DEBUG_LOGGER = debugContains("logger")
export const DEBUG_MAP = debugContains("map")
export const DEBUG_SAVE = debugContains("save")
export const DEBUG_STORES = debugContains("stores")
export const DEBUG_UNDO = debugContains("undo")
export const DEBUG_PLUGINS = debugContains("plugins")

export function debugLog(debugFlag: boolean, ...args: any[]) {
  // eslint-disable-next-line no-console
  debugFlag && console.log(...args)
}
