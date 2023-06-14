import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { kChildMostTableCollectionId, TRow } from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { IDataSet } from "../../models/data/data-set"
import { useCaseTableModel } from "./use-case-table-model"
import { CollectionTitle } from './collection-title'

import styles from "./case-table-shared.scss"
import "react-data-grid/lib/styles.css"

export const CollectionTable = observer(function CollectionTable() {
  const data = useDataSetContext()
  const collection = useCollectionContext()
  const tableModel = useCaseTableModel()
  const collectionId = collection?.id || kChildMostTableCollectionId
  const gridRef = useRef<DataGridHandle>(null)
  const { selectedRows, setSelectedRows, handleCellClick } = useSelectedRows({ gridRef })
  const { isTileSelected } = useTileModelContext()
  const isFocused = isTileSelected()

  useEffect(function syncScrollTop() {
    // There is a bug, seemingly in React, in which the scrollTop property gets reset
    // to 0 when the order of tiles is changed (which happens on selecting/focusing tiles
    // in the free tile layout), even though the CollectionTable and the RDG grid component
    // are not re-rendered or unmounted/mounted. Therefore, we reset the scrollTop property
    // from our saved cache on focus change.
    if (isFocused && gridRef.current?.element) {
      gridRef.current.element.scrollTop = tableModel?.scrollTopMap.get(collectionId) ?? 0
    }
  }, [isFocused, collectionId, tableModel])

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn })

  // rows
  const { rows, handleRowsChange } = useRows()
  const rowKey = (row: TRow) => row.__id__

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string) => {
    const attr = dataSet.attrFromID(attrId)
    attr && dataSet.moveAttributeToNewCollection(attrId, collection.id)
  }, [collection.id])

  if (!data) return null

  function handleGridScroll() {
    const gridElt = gridRef.current?.element
    ;(gridElt != null) &&
      tableModel?.setScrollTop(collectionId, gridElt.scrollTop)
  }

  return (
    <div className={`collection-table collection-${collectionId}`}>
      <CollectionTableSpacer rows={rows} onDrop={handleNewCollectionDrop} rowHeight={+styles.bodyRowHeight} />
      <div className="collection-table-and-title">
        <CollectionTitle />
        <DataGrid ref={gridRef} className="rdg-light"
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          onCellClick={handleCellClick} onRowsChange={handleRowsChange} onScroll={handleGridScroll}/>
      </div>
    </div>
  )
})
