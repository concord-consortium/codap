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
export const DEBUG_FORMULAS = debugContains("formulas")

export function debugLog(debugFlag: boolean, ...args: any[]) {
  // eslint-disable-next-line no-console
  debugFlag && console.log(...args)
}
