import { reaction } from "mobx"
import { useCallback, useEffect, useRef, useState, MouseEvent } from "react"
import { DataGridHandle } from "react-data-grid"
import { appState } from "../../models/app-state"
import { isPartialSelectionAction, isSelectionAction } from "../../models/data/data-set-actions"
import { collectionCaseIdFromIndex, collectionCaseIndexFromId } from "../../models/data/data-set-utils"
import { TCellClickArgs } from "./case-table-types"
import { useRowScrolling } from "./use-row-scrolling"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { onAnyAction } from "../../utilities/mst-utils"
import { prf } from "../../utilities/profiler"

interface UseSelectedRows {
  gridRef: React.RefObject<DataGridHandle | null>
}

export const useSelectedRows = ({ gridRef }: UseSelectedRows) => {
  const data = useDataSetContext()
  const collection = useCollectionContext()
  const [selectedRows, _setSelectedRows] = useState<ReadonlySet<string>>(() => new Set())
  const syncCount = useRef(0)

  const { scrollClosestRowIntoView, scrollRowIntoView } = useRowScrolling(gridRef.current?.element)

  // sync table changes to the DataSet model
  const setSelectedRows = useCallback((rowSet: ReadonlySet<string>) => {
    const rows = Array.from(rowSet)
    ++syncCount.current
    data?.setSelectedCases(rows)
    --syncCount.current
    _setSelectedRows(rowSet)
  }, [data])

  const syncRowSelectionToRdg = useCallback(() => {
    prf.measure("Table.syncRowSelectionToRdg", () => {
      const newSelection = prf.measure("Table.syncRowSelectionToRdg[reaction-copy]", () => {
        const selection = new Set<string>()
        const cases = data?.getCasesForCollection(collection.id) || []
        cases.forEach(aCase => data?.isCaseSelected(aCase.__id__) && selection.add(aCase.__id__))
        return selection
      })
      prf.measure("Table.syncRowSelectionToRdg[reaction-set]", () => {
        _setSelectedRows(newSelection)
      })
    })
  }, [collection, data])

  const syncRowSelectionToDom = useCallback(() => {
    prf.measure("Table.syncRowSelectionToDom", () => {
      const grid = document.querySelector(".rdg")
      const rows = grid?.querySelectorAll(".rdg-row")
      rows?.forEach(row => {
        const rowIndex = Number(row.getAttribute("aria-rowindex")) - 2
        const caseId = collectionCaseIdFromIndex(rowIndex, data, collection.id)
        const isSelected = row.getAttribute("aria-selected")
        const shouldBeSelected = caseId && data?.isCaseSelected(caseId)
        if (caseId && (isSelected !== shouldBeSelected)) {
          row.setAttribute("aria-selected", String(shouldBeSelected))
        }
      })
    })
  }, [collection, data])

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
    const disposer = data && onAnyAction(data, action => {
      prf.measure("Table.useSelectedRows[onAnyAction]", () => {
        if (isSelectionAction(action)) {
          if (appState.appMode === "performance") {
            syncRowSelectionToDom()
          }
          else {
            syncRowSelectionToRdg()
          }
          if (isPartialSelectionAction(action)) {
            const caseIds = action.args[0]
            const caseIndices = caseIds.map(id => collectionCaseIndexFromId(id, data, collection.id))
                                       .filter(index => index != null) as number[]
            const isSelecting = ((action.name === "selectCases") && action.args[1]) || true
            isSelecting && caseIndices.length && scrollClosestRowIntoView(caseIndices)
          }
        }
      })
    })
    return () => disposer?.()
  }, [collection, data, scrollClosestRowIntoView, syncRowSelectionToDom, syncRowSelectionToRdg])

  // anchor row for shift-selection
  const anchorCase = useRef<string | null>(null)

  const handleCellClick = useCallback(
  ({ row: { __id__: caseId } }: TCellClickArgs, event: MouseEvent<HTMLDivElement>) => {
    const isCaseSelected = data?.isCaseSelected(caseId)
    const isExtending = event.shiftKey || event.altKey || event.metaKey
    if (event.shiftKey && anchorCase.current) {
      const targetIndex = collectionCaseIndexFromId(caseId, data, collection.id)
      const anchorIndex = collectionCaseIndexFromId(anchorCase.current, data, collection.id)
      const casesToSelect: string[] = []
      if (targetIndex != null && anchorIndex != null) {
        const start = Math.min(anchorIndex, targetIndex)
        const end = Math.max(anchorIndex, targetIndex)
        for (let i = start; i <= end; ++i) {
          const id = collectionCaseIdFromIndex(i, data, collection.id)
          id && casesToSelect.push(id)
          data?.selectCases(casesToSelect, true)
        }
      }
      anchorCase.current = caseId
    }
    else if (isExtending) {
      data?.selectCases([caseId], !isCaseSelected)
      anchorCase.current = !isCaseSelected ? caseId : null
    }
    else if (!isCaseSelected) {
      data?.setSelectedCases([caseId])
      anchorCase.current = caseId
    }
  }, [collection, data])

  return { selectedRows, setSelectedRows, handleCellClick, scrollRowIntoView }
}
