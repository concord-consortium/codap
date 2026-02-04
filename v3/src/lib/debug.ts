/*
 * The DEBUG_* flags allow developer-facing features or console output to be enabled/disabled
 * for particular categories of features or output. To enable one or more DEBUG flags, set
 * the value of the `debug` property in the `Local Storage` section of the `Application` tab
 * of the browser DevTools to a string that includes one or more of the category strings
 * listed below. For instance, the string `logger undo` will enable the `DEBUG_LOGGER` and
 * `DEBUG_UNDO` flags. This allows some useful developer-facing features to remain in the
 * code because it can be enabled/disabled externally via the browser DevTools.
 *
 * These flags can then be used in code:
 * if (DEBUG_FOO) { ... do something that should only happen when debugging foo ... }
 *
 * There is also a debugLog() function for conditionally `console.log`ing:
 * debugLog(DEBUG_FOO, "String that should only be logged when debugging foo.")
 */
const debug = (window.localStorage ? window.localStorage.getItem("debug") : undefined) || ""
if (debug.length > 0) {
  // eslint-disable-next-line no-console
  console.info("DEBUG:", debug)
}

const debugContains = (key: string) => debug.indexOf(key) !== -1

export const DEBUG_CASE_IDS = debugContains("caseIds")
export const DEBUG_CFM_EVENTS = debugContains("cfmEvents")
export const DEBUG_CFM_LOCAL_STORAGE = debugContains("cfmLocalStorage")
export const DEBUG_CFM_NO_AUTO_SAVE = debugContains("cfmNoAutoSave")
export const DEBUG_DOCUMENT = debugContains("document")
export const DEBUG_EVENT_MODIFICATION = debugContains("eventModification")
export const DEBUG_FORMULAS = debugContains("formulas")
export const DEBUG_HISTORY = debugContains("history")
export const DEBUG_LOGGER = debugContains("logger")
export const DEBUG_MAP = debugContains("map")
export const DEBUG_PIXI_POINTS = debugContains("pixiPoints")
export const DEBUG_PLUGINS = debugContains("plugins")
export const DEBUG_RENDERERS = debugContains("renderers")
export const DEBUG_SAVE_AS_V2 = debugContains("saveAsV2")
export const DEBUG_UNDO = debugContains("undo")

export function debugLog(debugFlag: boolean, ...args: any[]) {
  // eslint-disable-next-line no-console
  debugFlag && console.log(...args)
}
