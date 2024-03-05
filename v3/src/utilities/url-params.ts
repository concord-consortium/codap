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

export let urlParams = queryString.parse(getSearchParams())

export const setUrlParams = (search: string) => urlParams = queryString.parse(search)

// remove developer-convenience url params
export function removeDevUrlParams() {
  removeSearchParams(["sample", "dashboard"])
}
