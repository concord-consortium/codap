import queryString from "query-string"

// separate function aids in tests
export const getSearchParams = () => location.search

export function removeSearchParams(paramsToRemove: string[]) {
  // Parse the current URL and its query string
  const url = new URL(window.location.href)
  const params = new URLSearchParams(url.search)

  // Remove specific parameters
  paramsToRemove.forEach(param => params.delete(param))

  // Rebuild the URL without the specific parameters
  const paramsStr = params.toString()
  const searchStr = paramsStr ? `?${paramsStr}` : ""
  const newUrl = `${url.protocol}//${url.host}${url.pathname}${searchStr}${url.hash}`

  // Update the URL in the address bar without reloading the page
  window.history.pushState({path: newUrl}, "", newUrl)
}

export interface UrlParams {
  /*
   * For testing -- when present brings up a default set of tiles (table, graph, calculator, slider, text).
   * value: ignored
   */
  dashboard?: string | null
  /*
   * [V2] Loads the specified url as a data interactive/plugin tile.
   * When combined with `di-override`, the specified url is used instead of the url
   * that matches the `di-override` value. This allows the `di` parameter to override
   * the default location of a plugin that is stored in a document.
   * value: url string
   */
  di?: string | null
  /*
   * [V2] Used in conjunction with the `di` parameter to override the default url of a plugin.
   * If the url of a plugin to be loaded matches this value, the url specified in the `di` parameter
   * (or `di-override-url` parameter) is used instead.
   * value: substring match for a plugin url
   */
  "di-override"?: string | null
  /*
   * [V2] Same as `di`, but can be used to override the `di` value as well.
   * value: url string
   */
  "di-override-url"?: string | null
  /*
   * When present enables the error tester component.
   * value: which type of error the tester should throw.
   * Possible values:
   * - "render": throws an error on render
   * - "firstDisplay": throws errors on first display see react-render-errors.md
   * - "none" (default): only throws an error on click
   */
  errorTester?: string | null
  /*
   * [V2] When present enables the gaussian fit feature of the normal curve adornment.
   * value: ignored
   */
  gaussianFit?: string | null
  /*
   * [V2] When present, disables the splash screen displayed on application startup.
   * value: ignored
   */
  hideSplashScreen?: string | null
  /*
   * [V2] When present, disables the loading message displayed in web views while waiting for
   * a plugin to load or communicate.
   * value: ignored
   */
  hideWebViewLoading?: string | null
  /*
   * [V2] When present enables the informal confidence interval on the box plot adornment.
   * value: ignored
   */
  ICI?: string | null
  /*
   * Indicates CODAP is running in the Activity Player. Used by the CFM and to configure
   * the CFM.
   * value: ignored
   */
  interactiveApi?: string | null
  /*
   * [V2] Specifies the default locale, overriding the browser default.
   * value: locale string, e.g. `en-US` or `es`
   */
  lang?: string | null
  /*
   * [V2] Alternate means to specify default locale.
   * V2 comment: "Allow override of lang query param"(?)
   * value: locale string, e.g. `en-US` or `es`
   */
  "lang-override"?: string | null
  /*
   * Specifies the type of tile container. Defaults to "free", which is the standard free layout used by CODAP.
   * Limited/provisional support for "mosaic" layout, in which tiles are connected and cannot overlap.
   * Experimental flag for possible future development direction.
   * value: "free" (default) | "mosaic"
   */
  layout?: string | null
  /*
   * [v3] Specifies a url that can be used to add additional items to the Plugins menu.
   * See useRemotePluginsConfig() hook for more details, including format of remote document.
   * value: url string
   */
  morePlugins?: string | null
  /*
   * For testing -- when present adds the DnDKit MouseSensor in addition to the PointerSensor for drag/drop.
   * The MouseSensor has proven more amenable for testing drag/drop in cypress tests.
   * value: ignored
   */
  mouseSensor?: string | null
  /*
   * For testing -- when present disables animation, which can be useful in automated tests.
   * value: ignored
   */
  noComponentAnimation?: string | null
  /*
   * For testing -- when present disables data tips, which can be useful in automated tests.
   * value: ignored
   */
  noDataTips?: string | null
  /*
  * Primarily for testing -- when present does not show the user entry modal on startup.
  * value: ignored
  */
  noEntryModal?: string | null
  /*
   * [V2/V3] Specifies the url of the folder from which to load plugins.
   * Useful for testing/debugging plugins from alternate locations.
   * value: url string
   */
  pluginURL?: string | null
  /*
   * Used to toggle certain features based on which version of CODAP is being run.
   * Currently supports "beta".
   */
  release?: string | null
  /*
   * For testing -- specifies a built-in sample document to be loaded on startup.
   * Useful for automated tests; often combined with `dashboard`.
   * value: "abalone" | "cats" | "coasters" | "colors" | "four" | "mammals"
   */
  sample?: string | null
  /*
   * Primarily for testing -- specifies whether scrolling should be "smooth" (default) or not.
   * Disable smooth scrolling by setting it to "auto", which can be useful in automated tests.
   * value: "auto" | "smooth" (default)
   */
  scrollBehavior?: string | null
  /*
   * [V2] Enables standalone mode for data interactives/plugins.
   * When set to 'true', enables full standalone mode.
   * When set to 'false', disables standalone mode (default).
   * When set to a plugin name, enables standalone mode only for that specific plugin.
   * value: 'true' | 'false' | plugin-name
   */
  standalone?: string | null
  /*
   * If a string value, the warning dialog triggered by reloading or navigating away from a document
   * with unsaved changes will not be shown.
   * Primarily used for cypress tests.
   */
  suppressUnsavedWarning?: string | null
  /*
   * For testing -- when present along with `dashboard`, only a single table will be created by default.
   * value: ignored
   */
  tableOnly?: string | null
  /*
   * [V2] Specifies the url of a document to load on application launch.
   * value: url string
   */
  url?: string | null
}

export let urlParams: UrlParams = queryString.parse(getSearchParams())

export const setUrlParams = (search: string) => urlParams = queryString.parse(search)

export function booleanParam(param?: string | null): boolean {
  // undefined => param is absent, which is treated as false
  if (param === undefined) return false
  // null => param is present without argument, which is treated as true
  if (param === null) return true
  // treat "false", "no", and "0" as false, everything else as true
  return !["false", "no", "0"].includes(param.toLowerCase())
}

// remove developer-convenience url params
export function removeDevUrlParams() {
  removeSearchParams(["dashboard", "sample", "tableOnly"])
}

export function getDataInteractiveUrl(url: string) {
  const diUrl = urlParams["di-override-url"] || urlParams.di
  const diOverride = urlParams["di-override"]

  if (diUrl && diOverride) {
    const hashIndex = url.indexOf('#')
    const urlNoHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : ""
    return urlNoHash.includes(diOverride) ? diUrl + hash : url
  }

  return url
}
