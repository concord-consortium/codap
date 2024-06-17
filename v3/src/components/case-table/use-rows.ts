import { format } from "d3"
import { reaction } from "mobx"
import { useCallback, useEffect, useRef } from "react"
import { symDom, TRow, TRowsChangeData } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { appState } from "../../models/app-state"
import { kDefaultFormatStr } from "../../models/data/attribute"
import { isAddCasesAction, isRemoveCasesAction, isSetCaseValuesAction } from "../../models/data/data-set-actions"
import { updateCasesNotification } from "../../models/data/data-set-notifications"
import { ICase, IGroupedCase, symFirstChild, symIndex, symParent } from "../../models/data/data-set-types"
import { isSetIsCollapsedAction } from "../../models/shared/shared-case-metadata"
import { onAnyAction } from "../../utilities/mst-utils"
import { prf } from "../../utilities/profiler"

export const useRows = () => {
  const caseMetadata = useCaseMetadata()
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const collectionTableModel = useCollectionTableModel()

  const getCases = useCallback(() => {
    return data?.getCasesForCollection(collectionId) ?? []
  }, [collectionId, data])

  // reload the cache, e.g. on change of DataSet
  const resetRowCache = useCallback(() => {
    if (!collectionTableModel) return
    const { rowCache } = collectionTableModel
    rowCache.clear()
    let prevParent: string | undefined
    getCases().forEach(({ __id__, [symIndex]: i, [symParent]: parent }: IGroupedCase) => {
      const firstChild = parent && (parent !== prevParent) ? { [symFirstChild]: true } : undefined
      rowCache.set(__id__, { __id__, [symIndex]: i, [symParent]: parent, ...firstChild })
      prevParent = parent
    })
  }, [collectionTableModel, getCases])

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
        return getCases().map(({ __id__ }) => {
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
  }, [caseMetadata, collectionTableModel, getCases])

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

    // rebuild the entire cache after grouping changes
    const reactionDisposer = reaction(
      () => data?.isValidCaseGroups,
      isValid => {
        if (isValid) {
          resetRowCache()
          if (appState.appMode === "performance") {
            syncRowsToDom()
          }
          else {
            syncRowsToRdg()
          }
        }
      }, { name: "useRows.useEffect.reaction [collectionGroups]", fireImmediately: true }
    )

    // update the affected rows on data changes without grouping changes
    const beforeAnyActionDisposer = data && onAnyAction(data, action => {
      if (!data?.collections.length && isRemoveCasesAction(action)) {
        const caseIds = action.args[0]
        // have to determine the lowest index before the cases are actually removed
        lowestIndex.current = Math.min(
          ...caseIds
            .map(id => data.caseIndexFromID(id) ?? -1)
            .filter(index => index >= 0)
        )
      }
    }, { attachAfter: false })
    const afterAnyActionDisposer = data && onAnyAction(data, action => {
      prf.measure("Table.useRows[onAnyAction]", () => {
        const isHierarchical = !!data?.collections.length
        const alwaysResetRowCacheActions = ["addAttribute", "removeAttribute", "setFormat"]
        const hierarchicalResetRowCacheActions = ["addCases", "setCaseValues", "removeCases"]
        let updateRows = false

        // some actions (more with hierarchical data sets) require rebuilding the entire row cache
        if (alwaysResetRowCacheActions.includes(action.name) ||
            (isHierarchical && hierarchicalResetRowCacheActions.includes(action.name))) {
          resetRowCache()
          updateRows = true
        }

        // non-hierarchical data sets can respond more efficiently to some actions
        if (!isHierarchical && hierarchicalResetRowCacheActions.includes(action.name)) {
          const getCasesToUpdate = (_cases: ICase[], index?: number) => {
            lowestIndex.current = index != null ? index : data.items.length
            const casesToUpdate = []
            for (let i=0; i<_cases.length; ++i) {
              lowestIndex.current = Math.min(lowestIndex.current, data.caseIndexFromID(_cases[i].__id__) ?? Infinity)
            }
            for (let j=lowestIndex.current; j < data.items.length; ++j) {
              casesToUpdate.push(data.items[j])
            }
            return casesToUpdate
          }

          if (isAddCasesAction(action)) {
            const [_cases] = action.args
            // update cache only for entries after the added cases
            const casesToUpdate = getCasesToUpdate(_cases)
            casesToUpdate.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
          }
          else if (isSetCaseValuesAction(action)) {
            // update cache entries for each affected case
            const [_cases] = action.args
            _cases.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
          }
          else if (isRemoveCasesAction(action)) {
            // remove affected cases from cache and update cache after deleted cases
            const [caseIds] = action.args
            caseIds.forEach(id => rowCache.delete(id))
            const casesToUpdate = getCasesToUpdate([], lowestIndex.current)
            casesToUpdate.forEach(({ __id__ }) => rowCache.set(__id__, { __id__ }))
          }
          updateRows = true
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
        const caseGroup = data?.caseGroupMap.get(caseId)
        const childCaseIds = caseGroup?.childCaseIds ?? caseGroup?.childItemIds
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
      reactionDisposer?.()
      beforeAnyActionDisposer?.()
      afterAnyActionDisposer?.()
      metadataDisposer?.()
    }
  }, [caseMetadata, collectionTableModel, data, resetRowCache, syncRowsToDom, syncRowsToRdg])

  const handleRowsChange = useCallback((_rows: TRow[], changes: TRowsChangeData) => {
    // when rows change, e.g. after cell edits, update the dataset
    const caseValues = changes.indexes.map(index => _rows[index] as ICase)
    data?.applyModelChange(
      () => data.setCaseValues(caseValues),
      {
        // TODO notifications should be () => updateCasesNotification, but that won't work well
        // until case ids are persistent
        notifications: updateCasesNotification(data, caseValues),
        undoStringKey: "DG.Undo.caseTable.editCellValue",
        redoStringKey: "DG.Redo.caseTable.editCellValue"
      }
    )
  }, [data])

  return { handleRowsChange }
}
