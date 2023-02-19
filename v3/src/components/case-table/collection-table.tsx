import React, { useRef } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { TRow } from "./case-table-types"
import { useCollectionContext } from "./collection-context"
import { NewCollectionDrop } from "./new-collection-drop"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useDataSetContext } from "../../hooks/use-data-set-context"

import styles from "./case-table-shared.scss"
import "react-data-grid/lib/styles.css"

export const CollectionTable = () => {
  const data = useDataSetContext()
  const collection = useCollectionContext()
  const gridRef = useRef<DataGridHandle>(null)

  const { selectedRows, setSelectedRows, handleRowClick } = useSelectedRows({ data, gridRef })

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn })

  // rows
  const { rows, handleRowsChange } = useRows()
  const rowKey = (row: TRow) => row.__id__

  if (!data) return null

  function handleNewCollectionDrop(attrId: string) {
    const attr = data?.attrFromID(attrId)
    if (data && attr) {
      data.moveAttributeToNewCollection(attrId, collection?.id)
    }
  }

  return (
    <div className="collection-table">
      <NewCollectionDrop onDrop={handleNewCollectionDrop} />
      <DataGrid ref={gridRef} className="rdg-light"
        columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
        rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
        onRowClick={handleRowClick} onRowsChange={handleRowsChange}/>
      {collection && <div className="collection-table-spacer" />}
    </div>
  )
}
