import { reaction } from "mobx"
import { useCallback, useEffect, useRef, useState } from "react"
import { CellMouseEvent, DataGridHandle } from "react-data-grid"
import { appState } from "../../models/app-state"
import { isPartialSelectionAction, isSelectionAction } from "../../models/data/data-set-actions"
import {
  collectionCaseIdFromIndex, collectionCaseIndexFromId, selectCases, setSelectedCases
} from "../../models/data/data-set-utils"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { onAnyAction } from "../../utilities/mst-utils"
import { prf } from "../../utilities/profiler"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"
import {
  kInputRowKey, OnScrollClosestRowIntoViewFn, OnScrollRowRangeIntoViewFn, TCellClickArgs
} from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"

interface UseSelectedRows {
  gridRef: React.RefObject<DataGridHandle | null>
  onScrollClosestRowIntoView: OnScrollClosestRowIntoViewFn
  onScrollRowRangeIntoView: OnScrollRowRangeIntoViewFn
}

export const useSelectedRows = (props: UseSelectedRows) => {
  const { onScrollClosestRowIntoView, onScrollRowRangeIntoView } = props
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const collectionTableModel = useCollectionTableModel()
  const [selectedRows, _setSelectedRows] = useState<ReadonlySet<string>>(() => new Set())
  const syncCount = useRef(0)

  // sync table changes to the DataSet model
  const setSelectedRows = useCallback((rowSet: ReadonlySet<string>) => {
    const rows = Array.from(rowSet)
    ++syncCount.current
    setSelectedCases(rows, data)
    --syncCount.current
    _setSelectedRows(rowSet)
  }, [data])

  const syncRowSelectionToRdg = useCallback(() => {
    return prf.measure("Table.syncRowSelectionToRdg", () => {
      const newSelection = prf.measure("Table.syncRowSelectionToRdg[reaction-copy]", () => {
        const selection = new Set<string>()
        const cases = data?.getCasesForCollection(collectionId) || []
        cases.forEach(aCase => data?.isCaseSelected(aCase.__id__) && selection.add(aCase.__id__))
        return selection
      })
      prf.measure("Table.syncRowSelectionToRdg[reaction-set]", () => {
        _setSelectedRows(newSelection)
      })
      return newSelection
    })
  }, [collectionId, data])

  const syncRowSelectionToDom = useCallback(() => {
    prf.measure("Table.syncRowSelectionToDom", () => {
      const grid = document.querySelector(".rdg")
      const rows = grid?.querySelectorAll(".rdg-row")
      rows?.forEach(row => {
        const rowIndex = Number(row.getAttribute("aria-rowindex")) - 2
        const caseId = collectionCaseIdFromIndex(rowIndex, data, collectionId)
        const isSelected = row.getAttribute("aria-selected")
        const shouldBeSelected = caseId && data?.isCaseSelected(caseId)
        if (caseId && (isSelected !== shouldBeSelected)) {
          row.setAttribute("aria-selected", String(!!shouldBeSelected))
        }
      })
    })
  }, [collectionId, data])

  // synchronize initial selection on mount
  useEffect(() => {
    const selectedCaseIds = Array.from(syncRowSelectionToRdg())
    if (selectedCaseIds.length) {
      const caseIndices = selectedCaseIds
                            .map(id => collectionCaseIndexFromId(id, data, collectionId))
                            .filter(index => index != null)
      if (caseIndices.length) {
        // delay required before scrolling to allow RDG to render its contents
        setTimeout(() => onScrollClosestRowIntoView(collectionId, caseIndices), 50)
      }
    }
  }, [collectionId, data, onScrollClosestRowIntoView, syncRowSelectionToRdg])

  useEffect(() => {
    const disposer = reaction(() => appState.appMode, mode => {
      prf.measure("Table.useSelectedRows[appModeReaction]", () => {
        if (mode === "normal") {
          // sync row selection with RDG/React upon return to normal
          syncRowSelectionToRdg()
        }
      })
    })
    return () => disposer()
  }, [syncRowSelectionToRdg])

  useEffect(() => {
    // synchronizing the DOM directly doesn't work with virtualization because we may
    // end up scrolling to a row that wasn't in the DOM at the time of the selection event
    // TODO: evaluate whether it's worth re-enabling direct DOM synchronization
    const kEnablePerformanceMode = false
    const disposer = data && onAnyAction(data, action => {
      prf.measure("Table.useSelectedRows[onAnyAction]", () => {
        if (isSelectionAction(action)) {
          if (kEnablePerformanceMode && appState.appMode === "performance") {
            syncRowSelectionToDom()
          }
          else {
            syncRowSelectionToRdg()
          }
          if (isPartialSelectionAction(action)) {
            const caseIds = action.args[0]
            const caseIndices = caseIds.map(id => collectionCaseIndexFromId(id, data, collectionId))
                                       .filter(index => index != null)
            const isSelecting = ((action.name === "selectCases") && action.args[1]) || true
            isSelecting && caseIndices.length && onScrollClosestRowIntoView(collectionId, caseIndices)
          }
        }
      })
    })
    return () => disposer?.()
  }, [collectionId, collectionTableModel, data, onScrollClosestRowIntoView,
      syncRowSelectionToDom, syncRowSelectionToRdg])

  // anchor row for shift-selection
  const anchorCase = useRef<string | null>(null)

  const handleCellClick = useCallback((cellClickArgs: TCellClickArgs, event: CellMouseEvent) => {
    const { column, row: { __id__: caseId }, selectCell } = cellClickArgs

    if (column.key !== kIndexColumnKey && caseId === kInputRowKey) {
      // prevent the RDG default behavior so we can handle the click ourselves
      event.preventGridDefault()

      // start editing immediately in the input row
      selectCell(true)

      // exit without row/case selection on clicks in the input row
      return
    }

    // ...and selects the entire case (or extends the selection)
    const isCaseSelected = data?.isCaseSelected(caseId)
    const isExtending = event.shiftKey || event.altKey || event.metaKey
    if (event.shiftKey && anchorCase.current) {
      const targetIndex = collectionCaseIndexFromId(caseId, data, collectionId)
      const anchorIndex = collectionCaseIndexFromId(anchorCase.current, data, collectionId)
      const casesToSelect: string[] = []
      if (targetIndex != null && anchorIndex != null) {
        const start = Math.min(anchorIndex, targetIndex)
        const end = Math.max(anchorIndex, targetIndex)
        for (let i = start; i <= end; ++i) {
          const id = collectionCaseIdFromIndex(i, data, collectionId)
          id && casesToSelect.push(id)
          selectCases(casesToSelect, data)
        }
      }
      anchorCase.current = caseId
    }
    else if (isExtending) {
      selectCases([caseId], data, !isCaseSelected)
    }
    // Note: in most UI environments, clicking on a selected item does not change the selection
    // because you may want to drag or otherwise interact with the current set of selected items.
    // In this case, we match the v2 behavior in that clicking on a single row when multiple rows
    // are selected deselects other rows.
    else {
      let caseIds = [caseId]
      setSelectedCases(caseIds, data)
      anchorCase.current = caseId

      // loop through collections and scroll newly selected child cases into view
      const collection = data?.getCollection(collectionId)
      for (let childCollection = collection?.child; childCollection; childCollection = childCollection?.child) {
        const childCaseIds: string[] = []
        const childIndices: number[] = []
        caseIds.forEach(id => {
          const caseInfo = data?.caseInfoMap.get(id)
          caseInfo?.childCaseIds?.forEach(childCaseId => {
            childCaseIds.push(childCaseId)
            const caseIndex = collectionCaseIndexFromId(childCaseId, data, childCollection.id)
            if (caseIndex != null) {
              childIndices.push(caseIndex)
            }
          })
        })
        // scroll to newly selected child cases (if any)
        if (childIndices.length) {
          onScrollRowRangeIntoView(childCollection.id, childIndices, { disableScrollSync: true })
        }
        // advance to child cases in next collection
        caseIds = childCaseIds
      }
    }
  }, [collectionId, data, onScrollRowRangeIntoView])

  return { selectedRows, setSelectedRows, handleCellClick }
}
