import queryString from "query-string"

// separate function aids in tests
export const getSearchParams = () => location.search

export let urlParams = queryString.parse(getSearchParams())

export const setUrlParams = (search: string) => urlParams = queryString.parse(search)
