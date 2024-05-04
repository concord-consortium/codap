import { reaction } from "mobx"
import { useCallback, useEffect, useRef, useState, MouseEvent } from "react"
import { DataGridHandle } from "react-data-grid"
import { appState } from "../../models/app-state"
import { isPartialSelectionAction, isSelectionAction } from "../../models/data/data-set-actions"
import {
  collectionCaseIdFromIndex, collectionCaseIndexFromId, selectCasesNotification
} from "../../models/data/data-set-utils"
import { OnScrollClosestRowIntoViewFn, TCellClickArgs } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { onAnyAction } from "../../utilities/mst-utils"
import { prf } from "../../utilities/profiler"

interface UseSelectedRows {
  gridRef: React.RefObject<DataGridHandle | null>
  onScrollClosestRowIntoView: OnScrollClosestRowIntoViewFn
}

export const useSelectedRows = ({ gridRef, onScrollClosestRowIntoView }: UseSelectedRows) => {
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const collectionTableModel = useCollectionTableModel()
  const [selectedRows, _setSelectedRows] = useState<ReadonlySet<string>>(() => new Set())
  const syncCount = useRef(0)

  // sync table changes to the DataSet model
  const setSelectedRows = useCallback((rowSet: ReadonlySet<string>) => {
    const rows = Array.from(rowSet)
    ++syncCount.current
    data?.applyModelChange(() => {
      data.setSelectedCases(rows)
    }, {
      notifications: () => selectCasesNotification(data)
    })
    --syncCount.current
    _setSelectedRows(rowSet)
  }, [data])

  const syncRowSelectionToRdg = useCallback(() => {
    prf.measure("Table.syncRowSelectionToRdg", () => {
      const newSelection = prf.measure("Table.syncRowSelectionToRdg[reaction-copy]", () => {
        const selection = new Set<string>()
        const cases = data?.getCasesForCollection(collectionId) || []
        cases.forEach(aCase => data?.isCaseSelected(aCase.__id__) && selection.add(aCase.__id__))
        return selection
      })
      prf.measure("Table.syncRowSelectionToRdg[reaction-set]", () => {
        _setSelectedRows(newSelection)
      })
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
          row.setAttribute("aria-selected", String(shouldBeSelected))
        }
      })
    })
  }, [collectionId, data])

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
                                       .filter(index => index != null) as number[]
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

  const handleCellClick = useCallback(
  ({ row: { __id__: caseId } }: TCellClickArgs, event: MouseEvent<HTMLDivElement>) => {
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
          data?.applyModelChange(() => {
            data.selectCases(casesToSelect, true)
          }, {
            notifications: () => selectCasesNotification(data)
          })
        }
      }
      anchorCase.current = caseId
    }
    else if (isExtending) {
      data?.applyModelChange(() => {
        data.selectCases([caseId], !isCaseSelected)
      }, {
        notifications: () => selectCasesNotification(data)
      })
      anchorCase.current = !isCaseSelected ? caseId : null
    }
    else if (!isCaseSelected) {
      data?.applyModelChange(() => {
        data.setSelectedCases([caseId])
      }, {
        notifications: () => selectCasesNotification(data)
      })
      anchorCase.current = caseId
    }
  }, [collectionId, data])

  return { selectedRows, setSelectedRows, handleCellClick }
}
