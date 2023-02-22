import { format } from "d3"
import { reaction } from "mobx"
import { onAction } from "mobx-state-tree"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { appState } from "../../models/app-state"
import { kDefaultFormatStr } from "../../models/data/attribute"
import { ICase } from "../../models/data/data-set-types"
import {
  AddCasesAction, isRemoveCasesAction, RemoveCasesAction, SetCaseValuesAction
} from "../../models/data/data-set-actions"
import { prf } from "../../utilities/profiler"
import { TRow, TRowsChangeData } from "./case-table-types"

export const useRows = () => {
  const data = useDataSetContext()
  const collection = useCollectionContext()
  // RDG memoizes on the row, so we need to pass a new "case" object to trigger a render.
  // Therefore, we cache each case object and update it when appropriate.
  const rowCache = useMemo(() => new Map<string, TRow>(), [])
  const [rows, setRows] = useState<TRow[]>([])

  const cases = useMemo(() => (data?.collectionGroups?.length
                                ? data.getCasesForCollection(collection?.id ?? "")
                                // disable warning for "unnecessary" dependency on data?.collectionGroups
                                // eslint-disable-next-line react-hooks/exhaustive-deps
                                : data?.cases) || [], [collection?.id, data, data?.collectionGroups])

  // reload the cache, e.g. on change of DataSet
  const resetRowCache = useCallback(() => {
    rowCache.clear()
    cases.forEach((aCase: TRow) => rowCache.set(aCase.__id__, { __id__: aCase.__id__, __index__: aCase.__index__ }))
  }, [cases, rowCache])

  const setCachedDomAttr = useCallback((caseId: string, attrId: string) => {
    const entry = rowCache.get(caseId)
    if (entry && !entry.__domAttrs__) entry.__domAttrs__ = new Set<string>()
    entry?.__domAttrs__?.add(attrId)
  }, [rowCache])

  const syncRowsToRdg = useCallback(() => {
    prf.measure("Table.useRows[syncRowsToRdg]", () => {
      // RDG memoizes the grid, so we need to pass a new rows array to trigger a render.
      const newRows = prf.measure("Table.useRows[syncRowsToRdg-copy]", () => {
        return cases.map(({ __id__ }) => rowCache.get(__id__)).filter(c => !!c) as ICase[]
      })
      prf.measure("Table.useRows[syncRowsToRdg-set]", () => {
        setRows(newRows || [])
      })
    })
  }, [cases, rowCache])

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
          const cellSpan = cell.querySelector(".cell-span")
          if (data && caseId && attr && cellSpan) {
            const strValue = data.getValue(caseId, attr.id)
            const numValue = data.getNumeric(caseId, attr.id)
            const formatStr = attr.format || kDefaultFormatStr
            const formatted = (numValue != null) && isFinite(numValue) ? format(formatStr)(numValue) : strValue
            cellSpan.textContent = formatted
            setCachedDomAttr(caseId, attr.id)
          }
        })
      })
    })
  }, [data, setCachedDomAttr])

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

  const lowestIndex = useRef<number>(Infinity)
  useEffect(() => {
    // initialize the cache
    resetRowCache()
    syncRowsToRdg()

    // update the cache on changes
    const beforeDisposer = data && onAction(data, action => {
      if (isRemoveCasesAction(action)) {
        const caseIds = action.args[0]
        // have to determine the lowest index before the cases are actually removed
        lowestIndex.current = Math.min(...caseIds.map(id => data.caseIndexFromID(id)).filter(index => index != null))
      }
    }, false)
    const afterDisposer = data && onAction(data, action => {
      prf.measure("Table.useRows[onAction]", () => {
        let updateRows = true

        const getCasesToUpdate = (_cases: ICase[], index?: number) => {
          lowestIndex.current = index != null ? index : data.cases.length
          const casesToUpdate = []
          for (let i=0; i<_cases.length; ++i) {
            lowestIndex.current = Math.min(lowestIndex.current, data.caseIndexFromID(_cases[i].__id__))
          }
          for (let j=lowestIndex.current; j < data.cases.length; ++j) {
            casesToUpdate.push(data.cases[j])
          }
          return casesToUpdate
        }

        switch (action.name) {
          case "addAttribute":
          case "removeAttribute":
          case "setFormat":
            // render all rows
            resetRowCache()
            break
          case "addCases": {
            const _cases = (action as AddCasesAction).args[0] || []
            // update cache only for entires after the added cases
            const casesToUpdate = getCasesToUpdate(_cases)
            casesToUpdate.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
            break
          }
          case "setCaseValues": {
            // update cache entries for each affected case
            const _cases = (action as SetCaseValuesAction).args[0] || []
            _cases.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
            resetRowCache()
            break
          }
          case "removeCases": {
            // remove affected cases from cache and update cache after deleted case
            const caseIds = (action as RemoveCasesAction).args[0] || []
            caseIds.forEach(id => rowCache.delete(id))
            const casesToUpdate = getCasesToUpdate([], lowestIndex.current)
            casesToUpdate.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
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
    return () => {
      beforeDisposer?.()
      afterDisposer?.()
    }
  }, [data, resetRowCache, rowCache, syncRowsToDom, syncRowsToRdg])

  const handleRowsChange = useCallback((_rows: TRow[], changes: TRowsChangeData) => {
    // when rows change, e.g. after cell edits, update the dataset
    const caseValues = changes.indexes.map(index => _rows[index] as ICase)
    data?.setCaseValues(caseValues)
  }, [data])

  return { rows, handleRowsChange }
}
