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
   * [v2] Loads the specified url as a data interactive/plugin tile.
   * value: url string
   */
  di?: string | null
  /*
   * When present enables the error tester component.
   * value: which type of error the tester should throw.
   * Possible values:
   * - "render": throws an error on render
   * - "none" (default): only throws an error on click
   */
  errorTester?: string | null
  /*
   * [v2] When present enables the gaussian fit feature of the normal curve adornment.
   * value: ignored
   */
  gaussianFit?: string | null
  /*
   * [v2] When present enables the informal confidence interval on the box plot adornment.
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
   * [v2] Specifies the default locale, overriding the browser default.
   * value: locale string, e.g. `en-US` or `es`
   */
  lang?: string | null
  /*
   * [v2] Alternate means to specify default locale.
   * v2 comment: "Allow override of lang query param"(?)
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
   * [v2/v3] Specifies the url of the folder from which to load plugins.
   * Useful for testing/debugging plugins from alternate locations.
   * value: url string
   */
  pluginURL?: string | null
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
   * For testing -- when present along with `dashboard`, only a single table will be created by default.
   * value: ignored
   */
  tableOnly?: string | null
  /*
   * [v2] Specifies the url of a document to load on application launch.
   * value: url string
   */
  url?: string | null
}

export let urlParams: UrlParams = queryString.parse(getSearchParams())

export const setUrlParams = (search: string) => urlParams = queryString.parse(search)

// remove developer-convenience url params
export function removeDevUrlParams() {
  removeSearchParams(["dashboard", "sample", "tableOnly"])
}
