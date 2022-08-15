import { reaction } from "mobx"
import { onAction } from "mobx-state-tree"
import { useCallback, useEffect, useRef, useState } from "react"
import { appState } from "../app-state"
import { IDataSet } from "../../data-model/data-set"
import { isPartialSelectionAction, isSelectionAction } from "../../data-model/data-set-actions"
import { prf } from "../../utilities/profiler"
import { isKeyDown } from "../../hooks/use-key-states"
import { TRow } from "./case-table-types"
import { DataGridHandle } from "react-data-grid"
import { useRowScrolling } from "./use-row-scrolling"

interface UseSelectedRows {
  data?: IDataSet
  gridRef: React.RefObject<DataGridHandle | null>
}
export const useSelectedRows = ({ data, gridRef }: UseSelectedRows) => {
  const [selectedRows, _setSelectedRows] = useState<ReadonlySet<string>>(() => new Set())
  const syncCount = useRef(0)

  const { scrollClosestRowIntoView } = useRowScrolling(gridRef.current?.element)

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
        return new Set(data?.selection)
      })
      prf.measure("Table.syncRowSelectionToRdg[reaction-set]", () => {
        _setSelectedRows(newSelection)
      })
    })
  }, [data?.selection])

  const syncRowSelectionToDom = useCallback(() => {
    prf.measure("Table.syncRowSelectionToDom", () => {
      const grid = document.querySelector(".rdg")
      const rows = grid?.querySelectorAll(".rdg-row")
      rows?.forEach(row => {
        const rowIndex = Number(row.getAttribute("aria-rowindex")) - 2
        const caseId = data?.caseIDFromIndex(rowIndex)
        const isSelected = row.getAttribute("aria-selected")
        const shouldBeSelected = caseId && data?.isCaseSelected(caseId)
        if (caseId && (isSelected !== shouldBeSelected)) {
          row.setAttribute("aria-selected", String(shouldBeSelected))
        }
      })
    })
  }, [data])

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
    const disposer = data && onAction(data, action => {
      prf.measure("Table.useSelectedRows[onAction]", () => {
        if (isSelectionAction(action)) {
          if (appState.appMode === "performance") {
            syncRowSelectionToDom()
          }
          else {
            syncRowSelectionToRdg()
          }
          if (isPartialSelectionAction(action)) {
            const caseIds = action.args[0]
            const caseIndices = caseIds.map(id => data?.caseIndexFromID(id)).filter(index => index != null)
            const isSelecting = ((action.name === "selectCases") && action.args[1]) || true
            isSelecting && caseIndices.length && scrollClosestRowIntoView(caseIndices)
          }
        }
      })
    }, true)
    return () => disposer?.()
  }, [data, scrollClosestRowIntoView, syncRowSelectionToDom, syncRowSelectionToRdg])

  // anchor row for shift-selection
  const anchorCase = useRef<string | null>(null)

  const handleRowClick = useCallback(({ __id__: caseId }: TRow) => {
    const isCaseSelected = data?.isCaseSelected(caseId)
    const isExtending = isKeyDown("Shift") || isKeyDown("Alt") || isKeyDown("Meta")
    if (isKeyDown("Shift") && anchorCase.current) {
      const targetIndex = data?.caseIndexFromID(caseId)
      const anchorIndex = data?.caseIndexFromID(anchorCase.current)
      const casesToSelect: string[] = []
      if (targetIndex != null && anchorIndex != null) {
        const start = Math.min(anchorIndex, targetIndex)
        const end = Math.max(anchorIndex, targetIndex)
        for (let i = start; i <= end; ++i) {
          const id = data?.cases[i].__id__
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
  }, [data])

  return { selectedRows, setSelectedRows, handleRowClick }
}
