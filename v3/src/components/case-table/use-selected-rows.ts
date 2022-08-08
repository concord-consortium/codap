import { reaction } from "mobx"
import { onAction } from "mobx-state-tree"
import { useCallback, useEffect, useRef, useState } from "react"
import { appState } from "../app-state"
import { IDataSet } from "../../data-model/data-set"
import { isSelectionAction } from "../../data-model/data-set-actions"
import { prf } from "../../utilities/profiler"

export const useSelectedRows = (data?: IDataSet) => {
  const [selectedRows, _setSelectedRows] = useState<ReadonlySet<string>>(() => new Set())
  const syncCount = useRef(0)

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
        }
      })
    }, true)
    return () => disposer?.()
  }, [data, syncRowSelectionToDom, syncRowSelectionToRdg])

  return [selectedRows, setSelectedRows] as const
}
