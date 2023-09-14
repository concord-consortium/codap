import { format } from "d3"
import { reaction } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { symDom, TRow, TRowsChangeData } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { appState } from "../../models/app-state"
import { kDefaultFormatStr } from "../../models/data/attribute"
import { ICase, IGroupedCase, symFirstChild, symIndex, symParent } from "../../models/data/data-set-types"
import {
  AddCasesAction, isRemoveCasesAction, RemoveCasesAction, SetCaseValuesAction
} from "../../models/data/data-set-actions"
import { isSetIsCollapsedAction } from "../../models/shared/shared-case-metadata"
import { onAnyAction } from "../../utilities/mst-utils"
import { prf } from "../../utilities/profiler"

export const useRows = () => {
  const caseMetadata = useCaseMetadata()
  const data = useDataSetContext()
  const collection = useCollectionContext()
  const collectionTableModel = useCollectionTableModel()

  const cases = useMemo(() => data?.collectionGroups?.length
                                ? data.getCasesForCollection(collection?.id ?? "")
                                : data ? getSnapshot(data.cases) as IGroupedCase[] : [],
                        // disable warning for "unnecessary" dependency on data?.collectionGroups
                        // eslint-disable-next-line react-hooks/exhaustive-deps
                        [collection?.id, data, data?.collectionGroups])

  // reload the cache, e.g. on change of DataSet
  const resetRowCache = useCallback(() => {
    if (!collectionTableModel) return
    const { rowCache } = collectionTableModel
    rowCache.clear()
    let prevParent: string | undefined
    cases.forEach(({ __id__, [symIndex]: i, [symParent]: parent }: IGroupedCase) => {
      const firstChild = parent && (parent !== prevParent) ? { [symFirstChild]: true } : undefined
      rowCache.set(__id__, { __id__, [symIndex]: i, [symParent]: parent, ...firstChild })
      prevParent = parent
    })
  }, [cases, collectionTableModel])

  const setCachedDomAttr = useCallback((caseId: string, attrId: string) => {
    if (!collectionTableModel) return
    const { rowCache } = collectionTableModel
    const row = rowCache.get(caseId)
    if (row && !row[symDom]) row[symDom] = new Set<string>()
    row?.[symDom]?.add(attrId)
  }, [collectionTableModel])

  const syncRowsToRdg = useCallback(() => {
    if (!collectionTableModel) return
    const { rowCache } = collectionTableModel
    prf.measure("Table.useRows[syncRowsToRdg]", () => {
      // RDG memoizes the grid, so we need to pass a new rows array to trigger a render.
      const newRows = prf.measure("Table.useRows[syncRowsToRdg-copy]", () => {
        return cases.map(({ __id__ }) => {
          const row = rowCache.get(__id__)
          const parentId = row?.[symParent]
          const isCollapsed = parentId && caseMetadata?.isCollapsed(parentId)
          return !isCollapsed || row?.[symFirstChild] ? row : undefined
        }).filter(c => !!c) as TRow[]
      })
      prf.measure("Table.useRows[syncRowsToRdg-set]", () => {
        collectionTableModel.resetRows(newRows || [])
      })
    })
  }, [caseMetadata, cases, collectionTableModel])

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
            const strValue = data.getStrValue(caseId, attr.id)
            const numValue = data.getNumeric(caseId, attr.id)
            const formatStr = attr.format || kDefaultFormatStr
            const formatted = (numValue != null) && isFinite(numValue) ? format(formatStr)(numValue) : strValue
            cellSpan.textContent = formatted ?? ""
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
    if (!collectionTableModel) return
    const { rowCache } = collectionTableModel

    // initialize the cache
    resetRowCache()
    syncRowsToRdg()

    // update the cache on data changes
    const beforeDisposer = data && onAnyAction(data, action => {
      if (isRemoveCasesAction(action)) {
        const caseIds = action.args[0]
        // have to determine the lowest index before the cases are actually removed
        lowestIndex.current = Math.min(...caseIds.map(id => data.caseIndexFromID(id)).filter(index => index != null))
      }
    }, { attachAfter: false })
    const afterDisposer = data && onAnyAction(data, action => {
      prf.measure("Table.useRows[onAnyAction]", () => {
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
    })

    // update the cache on metadata changes
    const metadataDisposer = caseMetadata && onAnyAction(caseMetadata, action => {
      if (isSetIsCollapsedAction(action)) {
        const [caseId] = action.args
        const caseGroup = data?.pseudoCaseMap[caseId]
        const childCaseIds = caseGroup?.childPseudoCaseIds ?? caseGroup?.childCaseIds
        const firstChildCaseId = childCaseIds?.[0]
        if (firstChildCaseId) {
          const row = rowCache.get(firstChildCaseId)
          if (row) {
            // copy the row to trigger re-render due to RDG memoization
            rowCache.set(firstChildCaseId, { ...row })
            syncRowsToRdg()
          }
        }
      }
    })
    return () => {
      beforeDisposer?.()
      afterDisposer?.()
      metadataDisposer?.()
    }
  }, [caseMetadata, collectionTableModel, data, resetRowCache, syncRowsToDom, syncRowsToRdg])

  const handleRowsChange = useCallback((_rows: TRow[], changes: TRowsChangeData) => {
    // when rows change, e.g. after cell edits, update the dataset
    const caseValues = changes.indexes.map(index => _rows[index] as ICase)
    data?.applyUndoableAction(
      () => data?.setCaseValues(caseValues),
      "DG.Undo.caseTable.editCellValue", "DG.Redo.caseTable.editCellValue")
  }, [data])

  return { handleRowsChange }
}
