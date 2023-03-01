import { observer } from "mobx-react-lite"
import pluralize from "pluralize"
import React, { useRef } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { kChildMostTableCollectionId, TRow } from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"

import styles from "./case-table-shared.scss"
import "react-data-grid/lib/styles.css"

export const CollectionTable = observer(function CollectionTable() {
  const data = useDataSetContext()
  const collection = useCollectionContext()
  const collectionId = collection?.id || kChildMostTableCollectionId
  const gridRef = useRef<DataGridHandle>(null)

  const { selectedRows, setSelectedRows, handleRowClick } = useSelectedRows({ gridRef })

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn })

  // rows
  const { rows, handleRowsChange } = useRows()
  const rowKey = (row: TRow) => row.__id__

  const defaultTableName = pluralize(collection?.attributes[0]?.name ?? data?.ungroupedAttributes[0]?.name ?? '')
  const caseCount = data?.getCasesForCollection(collection?.id).length ?? 0

  if (!data) return null

  function handleNewCollectionDrop(attrId: string) {
    const attr = data?.attrFromID(attrId)
    if (data && attr) {
      data.moveAttributeToNewCollection(attrId, collection?.id)
    }
  }

  return (
    <div className={`collection-table collection-${collectionId}`}>
      <CollectionTableSpacer onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title">
        <div className="collection-title">{`${defaultTableName} (${caseCount} cases)`}</div>
        <DataGrid ref={gridRef} className="rdg-light"
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          onRowClick={handleRowClick} onRowsChange={handleRowsChange}/>
      </div>
    </div>
  )
})
