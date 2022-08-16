import { format } from "d3"
import { reaction } from "mobx"
import { onAction } from "mobx-state-tree"
import { useCallback, useEffect, useMemo, useState } from "react"
import { kDefaultFormatStr } from "../../data-model/attribute"
import { ICase, IDataSet } from "../../data-model/data-set"
import { AddCasesAction, RemoveCasesAction, SetCaseValuesAction } from "../../data-model/data-set-actions"
import { prf } from "../../utilities/profiler"
import { appState } from "../app-state"
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

  const syncRowsToRdg = useCallback(() => {
    prf.measure("Table.useRows[syncRowsToRdg]", () => {
      // RDG memoizes the grid, so we need to pass a new rows array to trigger a render.
      const newRows = prf.measure("Table.useRows[syncRowsToRdg-copy]", () => {
        return data?.cases.map(({ __id__ }) => rowCache.get(__id__)).filter(c => !!c) as ICase[]
      })
      prf.measure("Table.useRows[syncRowsToRdg-set]", () => {
        setRows(newRows || [])
      })
    })
  }, [data?.cases, rowCache])

  const syncRowsToDom = useCallback(() => {
    prf.measure("Table.useRows[syncRowsToDom]", () => {
      const grid = document.querySelector(".rdg")
      const domRows = grid?.querySelectorAll(".rdg-row")
      domRows?.forEach(row => {
        const rowIndex = Number(row.getAttribute("aria-rowindex")) - 2
        const caseId = data?.caseIDFromIndex(rowIndex)
        const cells = row.querySelectorAll(".rdg-cell")
        cells.forEach(cell => {
          const colIndex = Number(cell.getAttribute("aria-colindex")) - 2
          const attr = data?.attributes[colIndex]
          if (data && caseId && attr) {
            const strValue = data.getValue(caseId, attr.id)
            const numValue = data.getNumeric(caseId, attr.id)
            const formatStr = attr.format || kDefaultFormatStr
            const formatted = (numValue != null) && isFinite(numValue) ? format(formatStr)(numValue) : strValue
            cell.textContent = formatted
          }
        })
      })
    })
  }, [data])

  useEffect(() => {
    const disposer = reaction(() => appState.appMode, mode => {
      prf.measure("Table.useRows[appModeReaction]", () => {
        if (mode === "normal") {
          // sync row selection with RDG/React upon return to normal
          syncRowsToRdg()
        }
      })
    })
    return () => disposer()
  }, [syncRowsToRdg])

  useEffect(() => {
    // initialize the cache
    resetRowCache()
    syncRowsToRdg()

    // update the cache on changes
    const disposer = data && onAction(data, action => {
      prf.measure("Table.useRows[onAction]", () => {
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
            const cases = (action as AddCasesAction | SetCaseValuesAction).args[0] || []
            cases.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
            break
          }
          case "removeCases": {
            // remove affected cases from cache
            const caseIds = (action as RemoveCasesAction).args[0] || []
            caseIds.forEach(id => rowCache.delete(id))
            break
          }
          default:
            updateRows = false
            break
        }

        if (updateRows) {
          if (appState.appMode === "performance") {
            syncRowsToDom()
          }
          else {
            syncRowsToRdg()
          }
        }
      })
    }, true)
    return () => disposer?.()
  }, [data, resetRowCache, rowCache, syncRowsToDom, syncRowsToRdg])

  const handleRowsChange = useCallback((_rows: TRow[], changes: TRowsChangeData) => {
    // when rows change, e.g. after cell edits, update the dataset
    const caseValues = changes.indexes.map(index => _rows[index] as ICase)
    data?.setCaseValues(caseValues)
  }, [data])

  return { rows, handleRowsChange }
}
