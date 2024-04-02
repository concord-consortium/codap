import { comparer } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { OnScrollClosestRowIntoViewFn, OnTableScrollFn, TRow } from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { CollectionTitle } from "./collection-title"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useForceUpdate } from "../../hooks/use-force-update"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { IDataSet } from "../../models/data/data-set"
import { useCollectionTableModel } from "./use-collection-table-model"
import { mstReaction } from "../../utilities/mst-reaction"

import "react-data-grid/lib/styles.css"
import styles from "./case-table-shared.scss"

type OnNewCollectionDropFn = (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void

interface IProps {
  onMount: (collectionId: string) => void
  onNewCollectionDrop: OnNewCollectionDropFn
  onTableScroll: OnTableScrollFn
  onScrollClosestRowIntoView: OnScrollClosestRowIntoViewFn
}
export const CollectionTable = observer(function CollectionTable(props: IProps) {
  const { onMount, onNewCollectionDrop, onTableScroll, onScrollClosestRowIntoView } = props
  const data = useDataSetContext()
  const metadata = useCaseMetadata()
  const collectionId = useCollectionContext()
  const collectionTableModel = useCollectionTableModel()
  const gridRef = useRef<DataGridHandle>(null)
  const { selectedRows, setSelectedRows, handleCellClick } = useSelectedRows({ gridRef, onScrollClosestRowIntoView })
  const { isTileSelected } = useTileModelContext()
  const isFocused = isTileSelected()
  const forceUpdate = useForceUpdate()

  useEffect(function setGridElement() {
    const element = gridRef.current?.element ?? undefined
    if (element && collectionTableModel) {
      collectionTableModel.setElement(element)
      onMount(collectionId)
    }
  }, [collectionId, collectionTableModel, gridRef.current?.element, onMount])

  useEffect(function syncScrollTop() {
    // There is a bug, seemingly in React, in which the scrollTop property gets reset
    // to 0 when the order of tiles is changed (which happens on selecting/focusing tiles
    // in the free tile layout), even though the CollectionTable and the RDG grid component
    // are not re-rendered or unmounted/mounted. Therefore, we reset the scrollTop property
    // from our saved cache on focus change.
    isFocused && collectionTableModel?.syncScrollTopToElement()
  }, [collectionTableModel, isFocused])

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn })

  // rows
  const { handleRowsChange } = useRows()
  const rowKey = (row: TRow) => row.__id__

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string) => {
    const attr = dataSet.attrFromID(attrId)
    attr && onNewCollectionDrop(dataSet, attrId, collectionId)
  }, [collectionId, onNewCollectionDrop])

  const handleGridScroll = useCallback(function handleGridScroll(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const gridElt = gridRef.current?.element
    if (gridElt != null) {
      collectionTableModel?.syncScrollTopFromEvent(event)
      onTableScroll(event, collectionId, gridElt)
    }
  }, [collectionId, collectionTableModel, onTableScroll])

  // column widths passed to RDG
  const columnWidths = useRef<Map<string, number>>(new Map())

  // respond to column width changes in shared metadata (e.g. undo/redo)
  useEffect(() => {
    return metadata && mstReaction(
      () => {
        const newColumnWidths = new Map<string, number>()
        columns.forEach(column => {
          const width = metadata?.columnWidths.get(column.key) ?? column.width
          if (width != null && typeof width === "number") {
            newColumnWidths.set(column.key, width)
          }
        })
        return newColumnWidths
      },
      newColumnWidths => {
        columnWidths.current = newColumnWidths
        forceUpdate()
      },
      { name: "CollectionTable.updateColumnWidths", fireImmediately: true, equals: comparer.structural },
      metadata)
  }, [columns, forceUpdate, metadata])

  // respond to column width changes from RDG
  const handleColumnResize = useCallback(
    function handleColumnResize(idx: number, width: number, isComplete?: boolean) {
      const attrId = columns[idx].key
      columnWidths.current.set(attrId, width)
      if (isComplete) {
        metadata?.applyUndoableAction(() => {
          metadata.columnWidths.set(attrId, width)
        }, {
          undoStringKey: "DG.Undo.caseTable.resizeOneColumn",
          redoStringKey: "DG.Redo.caseTable.resizeOneColumn"
        })
      }
    }, [columns, metadata])

  const rows = collectionTableModel?.rows
  if (!data || !rows) return null

  return (
    <div className={`collection-table collection-${collectionId}`}>
      <CollectionTableSpacer onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title">
        <CollectionTitle />
        <DataGrid ref={gridRef} className="rdg-light" data-testid="collection-table-grid"
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          columnWidths={columnWidths.current} onColumnResize={handleColumnResize}
          onCellClick={handleCellClick} onRowsChange={handleRowsChange} onScroll={handleGridScroll}/>
      </div>
    </div>
  )
})
