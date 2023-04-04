import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import pluralize from "pluralize"
import { kChildMostTableCollectionId, TRow } from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { CollectionTitle } from './collection-title'
import { getCollectionAttrs } from "../../models/data/data-set-utils"

import styles from "./case-table-shared.scss"
import "react-data-grid/lib/styles.css"

export const CollectionTable = observer(function CollectionTable() {
  const data = useDataSetContext()
  const collection = useCollectionContext()
  const collectionId = collection?.id || kChildMostTableCollectionId
  const gridRef = useRef<DataGridHandle>(null)

  const { selectedRows, setSelectedRows, handleCellClick } = useSelectedRows({ gridRef })

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
      data.moveAttributeToNewCollection(attrId, collection.id)
    }
  }

  return (
    <div className={`collection-table collection-${collectionId}`}>
      <CollectionTableSpacer onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title">
        <CollectionTitle setTitle={collection.setTitle} displayTitle={collection.displayTitle}
          defaultName={pluralize((getCollectionAttrs(collection, data)[0]?.name) ?? '')}
          caseCount={data?.getCasesForCollection(collection?.id).length ?? 0} />
        <DataGrid ref={gridRef} className="rdg-light"
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          onCellClick={handleCellClick} onRowsChange={handleRowsChange}/>
      </div>
    </div>
  )
})
