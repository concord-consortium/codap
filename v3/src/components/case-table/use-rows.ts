import { format } from "d3"
import { reaction } from "mobx"
import { onPatch } from "mobx-state-tree"
import { useCallback, useEffect, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useLoggingContext } from "../../hooks/use-log-context"
import { logMessageWithReplacement } from "../../lib/log-message"
import { appState } from "../../models/app-state"
import { kDefaultFormatStr } from "../../models/data/attribute"
import { isAddCasesAction, isRemoveCasesAction, isSetCaseValuesAction } from "../../models/data/data-set-actions"
import { createCasesNotification, updateCasesNotification } from "../../models/data/data-set-notifications"
import {
  IAddCasesOptions, ICase, ICaseCreation, IGroupedCase, symFirstChild, symIndex, symParent
} from "../../models/data/data-set-types"
import { setCaseValuesWithCustomUndoRedo } from "../../models/data/data-set-undo"
import { isSetIsCollapsedAction } from "../../models/shared/shared-case-metadata"
import { onAnyAction } from "../../utilities/mst-utils"
import { prf } from "../../utilities/profiler"
import { kInputRowKey, symDom, TRow, TRowsChangeData } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"

export const useRows = () => {
  const caseMetadata = useCaseMetadata()
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const collectionTableModel = useCollectionTableModel()
  const { getPendingLogMessage } = useLoggingContext()

  // reload the cache, e.g. on change of DataSet
  const resetRowCache = useCallback(() => {
    if (!collectionTableModel) return
    const { rowCache } = collectionTableModel
    rowCache.clear()
    const cases = data?.getCasesForCollection(collectionId) ?? []
    let prevParent: string | undefined
    cases.forEach(({ __id__, [symIndex]: i, [symParent]: parent }: IGroupedCase) => {
      const firstChild = parent && (parent !== prevParent) ? { [symFirstChild]: true } : undefined
      rowCache.set(__id__, { __id__, [symIndex]: i, [symParent]: parent, ...firstChild })
      prevParent = parent
    })
  }, [collectionId, collectionTableModel, data])

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
        const cases = data?.getCasesForCollection(collectionId) ?? []
        return cases.map(({ __id__ }) => {
          const row = rowCache.get(__id__)
          const parentId = row?.[symParent]
          const isCollapsed = parentId && caseMetadata?.isCollapsed(parentId)
          return !isCollapsed || row?.[symFirstChild] ? row : undefined
        }).filter(c => !!c)
      })
      prf.measure("Table.useRows[syncRowsToRdg-set]", () => {
        collectionTableModel.resetRows(newRows || [])
      })
    })
  }, [caseMetadata, collectionId, collectionTableModel, data])

  const syncRowsToDom = useCallback(() => {
    prf.measure("Table.useRows[syncRowsToDom]", () => {
      const grid = document.querySelector(".rdg")
      const domRows = grid?.querySelectorAll(".rdg-row")
      domRows?.forEach(row => {
        const rowIndex = Number(row.getAttribute("aria-rowindex")) - 2
        const caseId = data?.itemIDFromIndex(rowIndex)
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

  const resetRowCacheAndSyncRows = useDebouncedCallback(() => {
    resetRowCache()
    if (appState.appMode === "performance") {
      syncRowsToDom()
    }
    else {
      syncRowsToRdg()
    }
  })

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
      () => data?.isValidCases && data?.validationCount,
      validation => {
        if (typeof validation === "number") {
          resetRowCacheAndSyncRows()
        }
      }, { name: "useRows.useEffect.reaction [collectionGroups]", fireImmediately: true }
    )

    const onPatchDisposer = data && onPatch(data, ({ op, path, value }) => {
      // reset on any changes to items or hidden items
      if (/(_itemIds|hiddenItems)(\/\d+)?$/.test(path)) {
        resetRowCacheAndSyncRows()
      }
    })

    // update the affected rows on data changes without grouping changes
    const beforeAnyActionDisposer = data && onAnyAction(data, action => {
      if (!data?.collections.length && isRemoveCasesAction(action)) {
        const caseIds = action.args[0]
        // have to determine the lowest index before the cases are actually removed
        lowestIndex.current = Math.min(
          ...caseIds
            .map(id => data.getItemIndex(id) ?? -1)
            .filter(index => index >= 0)
        )
      }
    }, { attachAfter: false })
    const afterAnyActionDisposer = data && onAnyAction(data, action => {
      prf.measure("Table.useRows[onAnyAction]", () => {
        const isHierarchical = !!data?.collections.length
        const alwaysResetRowCacheActions = [
          "addAttribute", "moveAttribute", "moveAttributeToNewCollection", "removeAttribute", "setFormat"
        ]
        const hierarchicalResetRowCacheActions = ["addCases", "setCaseValues", "removeCases"]
        let updateRows = false

        // some actions (more with hierarchical data sets) require rebuilding the entire row cache
        if (alwaysResetRowCacheActions.includes(action.name) ||
            (isHierarchical && hierarchicalResetRowCacheActions.includes(action.name))) {
          resetRowCacheAndSyncRows()
        }

        // non-hierarchical data sets can respond more efficiently to some actions
        if (!isHierarchical && hierarchicalResetRowCacheActions.includes(action.name)) {
          const getCasesToUpdate = (_cases: ICase[], index?: number) => {
            lowestIndex.current = index != null ? index : data.items.length
            const casesToUpdate = []
            for (let i=0; i<_cases.length; ++i) {
              lowestIndex.current = Math.min(lowestIndex.current, data.getItemIndex(_cases[i].__id__) ?? Infinity)
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
        const caseGroup = data?.caseInfoMap.get(caseId)
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
      onPatchDisposer?.()
      beforeAnyActionDisposer?.()
      afterAnyActionDisposer?.()
      metadataDisposer?.()
    }
  }, [caseMetadata, collectionTableModel, data, resetRowCache, resetRowCacheAndSyncRows, syncRowsToDom, syncRowsToRdg])

  const handleRowsChange = useCallback((_rows: TRow[], changes: TRowsChangeData) => {
    // when rows change, e.g. after cell edits, update the dataset
    const collection = data?.getCollection(collectionTableModel?.collectionId)
    const inputRowIndex = collectionTableModel?.inputRowIndex
    const caseValues = changes.indexes.map(index => _rows[index] as ICase)
    const casesToUpdate: ICase[] = []
    const casesToCreate: ICaseCreation[] = []
    caseValues.forEach(aCase => {
      if (aCase.__id__ === kInputRowKey) {
        const { __id__, ...others } = aCase

        // Do not add a new item if no actual values are specified.
        // This can happen when a user starts editing a cell in the input row, but then navigates away with
        // the cell left blank
        if (!Object.values(others).some(value => !!value)) return

        // Find values inherited from parent case
        const prevRowIndex = inputRowIndex != null && inputRowIndex !== -1
          ? inputRowIndex > 0 ? inputRowIndex - 1 : 1
          : _rows.length - 2
        const prevRowId = _rows[prevRowIndex].__id__
        const prevRow = collectionTableModel?.rowCache.get(prevRowId)
        const parentId = prevRow?.[symParent]
        const parentValues = data?.getParentValues(parentId ?? "") ?? {}

        casesToCreate.push({ ...others, ...parentValues })
      } else {
        casesToUpdate.push(aCase)
      }
    })

    const creatingCases = casesToCreate.length > 0
    const undoStringKey = creatingCases ? "DG.Undo.caseTable.createNewCase" : "DG.Undo.caseTable.editCellValue"
    const redoStringKey = creatingCases ? "DG.Redo.caseTable.createNewCase" : "DG.Redo.caseTable.editCellValue"
    const logMessage = creatingCases
                        ? logMessageWithReplacement("Create %@ cases in table", { count: casesToCreate.length })
                        : getPendingLogMessage("editCellValue")
    // We track case ids between updates and additions so we can make proper notifications afterwards
    let oldCaseIds = new Set(collection?.caseIds ?? [])
    let updatedCaseIds: string[] = []
    const newCaseIds: string[] = []
    data?.applyModelChange(
      () => {
        // Update existing cases
        if (casesToUpdate.length > 0) {
          setCaseValuesWithCustomUndoRedo(data, casesToUpdate)
          if (collection?.id === data.childCollection.id) {
            // The child collection's case ids are persistent, so we can just use the casesToUpdate to
            // determine which case ids to use in the updateCasesNotification
            updatedCaseIds = casesToUpdate.map(aCase => aCase.__id__)
          } else {
            // Other collections have cases whose ids change when values change due to updated case grouping,
            // so we have to check which case ids were not present before updating to determine which case ids
            // to use in the updateCasesNotification
            collection?.caseIds.forEach(caseId => {
              if (!oldCaseIds.has(caseId)) updatedCaseIds.push(caseId)
            })
          }
          oldCaseIds = new Set(collection?.caseIds ?? [])
        }

        // Create new cases
        if (creatingCases) {
          const options: IAddCasesOptions = {}
          if (collectionTableModel?.inputRowIndex != null && collectionTableModel.inputRowIndex >= 0) {
            options.before = collection?.caseIds[collectionTableModel.inputRowIndex]
            collectionTableModel.setInputRowIndex(collectionTableModel.inputRowIndex + 1)
          }
          data.addCases(casesToCreate, options)
          // Make sure things are updated since adding cases invalidates grouping
          // TODO Would it be better to make collection.caseIds a getter that automatically validates the cases?
          data.validateCases()
          // We look for case ids that weren't present before adding the new cases to determine which case ids
          // should be included in the createCasesNotification
          collection?.caseIds.forEach(caseId => {
            if (!oldCaseIds.has(caseId)) newCaseIds.push(caseId)
          })
        }
      },
      {
        notify: () => {
          const notifications = []
          if (updatedCaseIds.length > 0) {
            const updatedCases = updatedCaseIds.map(caseId => data.caseInfoMap.get(caseId))
              .filter(caseGroup => !!caseGroup)
              .map(caseGroup => caseGroup.groupedCase)
            notifications.push(updateCasesNotification(data, updatedCases))
          }
          if (newCaseIds.length > 0) notifications.push(createCasesNotification(newCaseIds, data))
          return notifications
        },
        undoStringKey,
        redoStringKey,
        log: logMessage
      }
    )
  }, [collectionTableModel, data, getPendingLogMessage])

  return { handleRowsChange }
}
