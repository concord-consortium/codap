import { onAction } from "mobx-state-tree"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ICase, IDataSet } from "../../data-model/data-set"
import { TRow, TRowsChangeData } from "./case-table-types"

export const useRows = (data?: IDataSet) => {
  // RDG memoizes on the row, so we need to pass a new "case" object to trigger a render.
  // Therefore, we cache each case object and update it when appropriate.
  const rowCache = useMemo(() => new Map<string, ICase>(), [])
  const [rows, setRows] = useState<TRow[]>([])

  // reload the cache, e.g. on change of DataSet
  const resetRowCache = useCallback(() => {
    rowCache.clear()
    data?.cases.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
  }, [data?.cases, rowCache])

  const setRowsFromCache = useCallback(() => {
    // RDG memoizes the grid, so we need to pass a new rows array to trigger a render.
    // If constructing the rows array from scratch ever becomes a performance issue,
    // we could maintain two arrays and alternate between them, for instance.
    setRows(data?.cases.map(({ __id__ }) => rowCache.get(__id__)).filter(c => !!c) as ICase[] || [])
  }, [data?.cases, rowCache])

  useEffect(() => {
    // initialize the cache
    resetRowCache()
    setRowsFromCache()

    // update the cache on changes
    const disposer = data && onAction(data, action => {
      let updateRows = true

      switch(action.name) {
        case "addAttribute":
        case "removeAttribute":
        case "setFormat":
          // render all rows
          resetRowCache()
          break
        case "addCases":
        case "setCaseValues": {
          // update cache entries for each affected case
          const cases = action.args?.[0] as ICase[] || []
          cases.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
          break
        }
        case "removeCases": {
          // remove affected cases from cache
          const caseIds = action.args?.[0] as string[] || []
          caseIds.forEach(id => rowCache.delete(id))
          break
        }
        default:
          updateRows = false
          break
      }

      updateRows && setRowsFromCache()
    })
    return () => disposer?.()
  }, [data, resetRowCache, rowCache, setRowsFromCache])

  const handleRowsChange = useCallback((_rows: TRow[], changes: TRowsChangeData) => {
    // when rows change, e.g. after cell edits, update the dataset
    const caseValues = changes.indexes.map(index => _rows[index] as ICase)
    data?.setCaseValues(caseValues)
  }, [data])

  return { rows, handleRowsChange }
}
