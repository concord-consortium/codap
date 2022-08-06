import { parse } from "query-string"

// separate function aids in tests
export const getSearchParams = () => location.search

export let urlParams = parse(getSearchParams())

export const setUrlParams = (search: string) => urlParams = parse(search)
