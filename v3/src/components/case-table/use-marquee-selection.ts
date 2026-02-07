import React, { useCallback, useEffect, useRef } from "react"
import { DataGridHandle } from "react-data-grid"
import { collectionCaseIdFromIndex, collectionCaseIndexFromId, setSelectedCases } from "../../models/data/data-set-utils"
import { IDataSet } from "../../models/data/data-set"
import { CollectionTableModel } from "./collection-table-model"

import styles from "./case-table-shared.scss"

const kAutoScrollTickInterval = 16 // ms between auto-scroll ticks
const kAutoScrollTicksPerSecond = 1000 / kAutoScrollTickInterval
const kAutoScrollSpeedFactor = 0.5 // rows per second per pixel of distance from grid edge
const kMaxAutoScrollSpeed = 8 // max rows scrolled per tick

// Helper function to get the case id from a pointer event
function getCaseIdFromEvent(event: React.PointerEvent) {
  const target = event.target as HTMLElement
  const closestContentCell = target.closest<HTMLDivElement>(".codap-index-cell") ??
                              target.closest<HTMLDivElement>(".codap-data-cell")
  const classesIterator = closestContentCell?.classList.values()
  let caseId = ""
  if (classesIterator) {
    for (const value of classesIterator) {
      const rowIdPrefix = "rowId-"
      if (value.startsWith(rowIdPrefix)) {
        caseId = value.substring(rowIdPrefix.length)
      }
    }
  }
  return caseId
}

interface UseMarqueeSelectionProps {
  gridRef: React.RefObject<DataGridHandle | null>
  collectionTableModel: CollectionTableModel | undefined
  data: IDataSet | undefined
  collectionId: string
  rows: Array<{ __id__: string }> | undefined
}

export function useMarqueeSelection({
  gridRef, collectionTableModel, data, collectionId, rows
}: UseMarqueeSelectionProps) {
  const isSelecting = useRef(false)
  const selectionStartRowIdx = useRef<number | null>(null)
  const scrollInterval = useRef<number | null>(null)
  const pointerY = useRef<number>(0)
  const rowsLengthRef = useRef(0)
  rowsLengthRef.current = rows?.length ?? 0

  const marqueeSelectCases = useCallback((startIdx: number, endIdx: number) => {
    const newSelectedRows = []
    const start = Math.min(startIdx, endIdx)
    const end = Math.max(startIdx, endIdx)
    for (let i = start; i <= end; i++) {
      newSelectedRows.push(i)
    }
    const selectedCaseIds = newSelectedRows
                              .map(idx => collectionCaseIdFromIndex(idx, data, collectionId))
                              .filter((id): id is string => id !== undefined)
    setSelectedCases(selectedCaseIds, data)
  }, [collectionId, data])
  const marqueeSelectCasesRef = useRef(marqueeSelectCases)
  marqueeSelectCasesRef.current = marqueeSelectCases

  const stopAutoScroll = useCallback(() => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current)
      scrollInterval.current = null
    }
  }, [])

  const getRowIndexFromEvent = (event: React.PointerEvent) => {
    const caseId = getCaseIdFromEvent(event)
    return caseId ? collectionCaseIndexFromId(caseId, data, collectionId) : null
  }

  // Document-level listeners to track pointer position during marquee selection,
  // even when the pointer moves outside the component bounds.
  const docMoveHandler = useRef<((e: PointerEvent) => void) | null>(null)
  const docUpHandler = useRef<((e: PointerEvent) => void) | null>(null)

  const cleanupDocListeners = useCallback(() => {
    if (docMoveHandler.current) {
      document.removeEventListener("pointermove", docMoveHandler.current)
      docMoveHandler.current = null
    }
    if (docUpHandler.current) {
      document.removeEventListener("pointerup", docUpHandler.current)
      docUpHandler.current = null
    }
  }, [])

  // Clean up document-level listeners on unmount
  useEffect(() => cleanupDocListeners, [cleanupDocListeners])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const startRowIdx = getRowIndexFromEvent(event)
    if (startRowIdx != null) {
      selectionStartRowIdx.current = startRowIdx
      isSelecting.current = true
      pointerY.current = event.clientY

      // Capture grid/rowHeight at pointer-down time for use in closures below.
      const grid = gridRef.current?.element
      const rHeight = collectionTableModel?.rowHeight
      if (!grid || !rHeight) return

      // Start auto-scroll interval. Uses collectionTableModel's scroll API
      // because React Data Grid overrides direct scrollTop manipulation.
      // Speed ramps up proportionally to pointer distance from the grid edge.
      stopAutoScroll()
      const ctModel = collectionTableModel
      let scrollAccumulator = 0
      const headerHeight = +styles.headerRowHeight
      scrollInterval.current = window.setInterval(() => {
        if (!ctModel) return
        const { top, bottom } = grid.getBoundingClientRect()
        const dataTop = top + headerHeight // below the attribute header row
        let direction = 0
        let distance = 0
        if (pointerY.current < dataTop) {
          direction = -1
          distance = dataTop - pointerY.current
        } else if (pointerY.current > bottom) {
          direction = 1
          distance = pointerY.current - bottom
        } else {
          scrollAccumulator = 0
          return
        }
        // Rows per second scales with distance, clamped to max speed
        const rowsPerSecond = Math.min(kMaxAutoScrollSpeed * kAutoScrollTicksPerSecond,
                                        Math.max(1, distance * kAutoScrollSpeedFactor))
        scrollAccumulator += rowsPerSecond / kAutoScrollTicksPerSecond
        if (scrollAccumulator >= 1) {
          const rowDelta = Math.floor(scrollAccumulator) * direction
          scrollAccumulator -= Math.abs(rowDelta)
          const numRows = rowsLengthRef.current
          const targetRowIdx = rowDelta < 0
            ? Math.max(0, ctModel.firstVisibleRowIndex + rowDelta)
            : Math.min(numRows - 1, ctModel.lastVisibleRowIndex + rowDelta)
          if (rowDelta < 0) {
            ctModel.scrollRowToTop(targetRowIdx, { scrollBehavior: "auto" })
          } else {
            ctModel.scrollRowToBottom(targetRowIdx, { scrollBehavior: "auto" })
          }
          if (selectionStartRowIdx.current != null && targetRowIdx >= 0 && targetRowIdx < numRows) {
            marqueeSelectCasesRef.current(selectionStartRowIdx.current, targetRowIdx)
          }
        }
      }, kAutoScrollTickInterval)

      // Attach document-level listener to track pointer position even outside the component.
      cleanupDocListeners()
      docMoveHandler.current = (e: PointerEvent) => { pointerY.current = e.clientY }
      docUpHandler.current = () => {
        cleanupDocListeners()
        isSelecting.current = false
        selectionStartRowIdx.current = null
        stopAutoScroll()
      }
      document.addEventListener("pointermove", docMoveHandler.current)
      document.addEventListener("pointerup", docUpHandler.current)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isSelecting.current && selectionStartRowIdx.current !== null) {
      const currentRowIdx = getRowIndexFromEvent(event)
      if (currentRowIdx != null) {
        marqueeSelectCases(selectionStartRowIdx.current, currentRowIdx)
      }
      pointerY.current = event.clientY
    }
  }

  // Mirrors cleanup in the document-level pointerup handler. Both are needed because
  // the document handler may not fire if the pointer is released inside the component
  // (due to event ordering), and this handler won't fire if the pointer is outside.
  const handlePointerUp = useCallback(() => {
    cleanupDocListeners()
    isSelecting.current = false
    selectionStartRowIdx.current = null
    stopAutoScroll()
  }, [cleanupDocListeners, stopAutoScroll])

  return { handlePointerDown, handlePointerMove, handlePointerUp }
}
