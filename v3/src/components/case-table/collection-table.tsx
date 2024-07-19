import { comparer } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useMemo, useRef } from "react"
import DataGrid, { CellKeyboardEvent, DataGridHandle } from "react-data-grid"
import { kCollectionTableBodyDropZoneBaseId } from "./case-table-drag-drop"
import {
  kInputRowKey, OnScrollClosestRowIntoViewFn, OnTableScrollFn, TCellKeyDownArgs, TRenderers, TRow
} from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { CollectionTitle } from "./collection-title"
import { customRenderRow } from "./custom-row"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedCell } from "./use-selected-cell"
import { useSelectedRows } from "./use-selected-rows"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileDroppable } from "../../hooks/use-drag-drop"
import { useForceUpdate } from "../../hooks/use-force-update"
import { useVisibleAttributes } from "../../hooks/use-visible-attributes"
import { IDataSet } from "../../models/data/data-set"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"
import { mstReaction } from "../../utilities/mst-reaction"
import { IAttribute } from "../../models/data/attribute"
import { uniqueName } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { createAttributesNotification } from "../../models/data/data-set-notifications"

import "react-data-grid/lib/styles.css"
import styles from "./case-table-shared.scss"

type OnNewCollectionDropFn = (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void

// custom renderers for use with RDG
const renderers: TRenderers = { renderRow: customRenderRow }

interface IProps {
  onMount: (collectionId: string) => void
  onNewCollectionDrop: OnNewCollectionDropFn
  onTableScroll: OnTableScrollFn
  onScrollClosestRowIntoView: OnScrollClosestRowIntoViewFn
}
export const CollectionTable = observer(function CollectionTable(props: IProps) {
  const { onMount, onNewCollectionDrop, onTableScroll, onScrollClosestRowIntoView } = props
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const caseTableModel = useCaseTableModel()
  const collectionTableModel = useCollectionTableModel()
  const gridRef = useRef<DataGridHandle>(null)
  const visibleAttributes = useVisibleAttributes(collectionId)
  const { selectedRows, setSelectedRows, handleCellClick } = useSelectedRows({ gridRef, onScrollClosestRowIntoView })
  const forceUpdate = useForceUpdate()

  useEffect(function setGridElement() {
    const element = gridRef.current?.element ?? undefined
    if (element && collectionTableModel) {
      collectionTableModel.setElement(element)
      onMount(collectionId)
    }
  }, [collectionId, collectionTableModel, gridRef.current?.element, onMount])

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn })

  // rows
  const { handleRowsChange } = useRows()
  const rowKey = (row: TRow) => row.__id__

  const { setNodeRef } = useTileDroppable(`${kCollectionTableBodyDropZoneBaseId}-${collectionId}`)

  const { handleSelectedCellChange, navigateToNextRow } = useSelectedCell(gridRef, columns)

  function handleCellKeyDown(args: TCellKeyDownArgs, event: CellKeyboardEvent) {
    // By default in RDG, the enter/return key simply enters/exits edit mode without moving the
    // selected cell. In CODAP, the enter/return key should accept the edit _and_ advance to the
    // next row. To achieve this in RDG, we provide this callback, which is called before RDG
    // handles the event internally. If we get an enter/return key while in edit mode, we handle
    // it ourselves and call `preventGridDefault()` to prevent RDG from handling the event itself.
    if (args.mode === "EDIT" && event.key === "Enter") {
      // complete the cell edit
      args.onClose(true)
      // prevent RDG from handling the event
      event.preventGridDefault()
      navigateToNextRow(event.shiftKey)
    }
  }

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
    return caseTableModel && mstReaction(
      () => {
        const newColumnWidths = new Map<string, number>()
        columns.forEach(column => {
          const width = caseTableModel.columnWidths.get(column.key) ?? column.width
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
      caseTableModel)
  }, [caseTableModel, columns, forceUpdate])

  // respond to column width changes from RDG
  const handleColumnResize = useCallback(
    function handleColumnResize(idx: number, width: number, isComplete?: boolean) {
      const attrId = columns[idx].key
      columnWidths.current.set(attrId, width)
      if (isComplete) {
        caseTableModel?.applyModelChange(() => {
          caseTableModel?.columnWidths.set(attrId, width)
        }, {
          undoStringKey: "DG.Undo.caseTable.resizeOneColumn",
          redoStringKey: "DG.Redo.caseTable.resizeOneColumn"
        })
      }
    }, [columns, caseTableModel])

  const handleAddNewAttribute = () => {
    let attribute: IAttribute | undefined
    data?.applyModelChange(() => {
      const newAttrName = uniqueName(t("DG.CaseTable.defaultAttrName"),
        (aName: string) => !data.attributes.find(attr => aName === attr.name)
      )
      attribute = data.addAttribute({ name: newAttrName }, { collection: collectionId })
      if (attribute) {
        collectionTableModel?.setAttrIdToEdit(attribute.id)
      }
    }, {
      notifications: () => createAttributesNotification(attribute ? [attribute] : [], data),
      undoStringKey: "DG.Undo.caseTable.createAttribute",
      redoStringKey: "DG.Redo.caseTable.createAttribute"
    })
    gridRef.current?.selectCell({idx: columns.length, rowIdx: -1})
  }

  const rows = useMemo(() => {
    if (collectionTableModel?.rows) {
      const _rows = [...collectionTableModel.rows]
      const inputRow = { __id__: kInputRowKey }
      if (collectionTableModel.inputRowIndex === -1) {
        _rows.push(inputRow)
      } else {
        _rows.splice(collectionTableModel.inputRowIndex, 0, inputRow)
      }
      return _rows
    }
  }, [collectionTableModel?.rows, collectionTableModel?.inputRowIndex])

  if (!data || !rows || !visibleAttributes.length) return null

  return (
    <div className={`collection-table collection-${collectionId}`}>
      <CollectionTableSpacer onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title" ref={setNodeRef}>
        <CollectionTitle onAddNewAttribute={handleAddNewAttribute}/>
        <DataGrid ref={gridRef} className="rdg-light" data-testid="collection-table-grid" renderers={renderers}
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          columnWidths={columnWidths.current} onColumnResize={handleColumnResize} onCellClick={handleCellClick}
          onCellKeyDown={handleCellKeyDown} onRowsChange={handleRowsChange} onScroll={handleGridScroll}
          onSelectedCellChange={handleSelectedCellChange}/>
      </div>
    </div>
  )
})
