import { observer } from "mobx-react-lite"
import pluralize from "pluralize"
import React, { useEffect, useRef, useState } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { motion } from "framer-motion"
import { kChildMostTableCollectionId, TRow } from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { useTileDisplayContext } from "../tile-display-context"

import styles from "./case-table-shared.scss"
import "react-data-grid/lib/styles.css"

interface ICollectionTableProps {
  tableScrollLeft: number,
}

export const CollectionTable = observer(function CollectionTable({ tableScrollLeft }: ICollectionTableProps) {
  const data = useDataSetContext()
  const collection = useCollectionContext()
  const { width, left } = useTileDisplayContext()
  const collectionId = collection?.id || kChildMostTableCollectionId
  const gridRef = useRef<DataGridHandle>(null)

  const { selectedRows, setSelectedRows, handleCellClick } = useSelectedRows({ gridRef })

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn })

  // rows
  const { rows, handleRowsChange } = useRows()
  const rowKey = (row: TRow) => row.__id__

  const defaultTableName = pluralize((collection.displayTitle || getCollectionAttrs(collection, data)[0]?.name) ?? '')
  const caseCount = data?.getCasesForCollection(collection?.id).length ?? 0

  const [titleBarStyle, setTitleBarStyle] = useState({ left: 0, right: 0 })
  const titleRef = useRef<HTMLDivElement>(null)
  const refExists = titleRef.current != null
  useEffect(() => {
    if (!refExists) {
      return
    }
    const tileWidth = width || 580
    const tileLeft = left || 0
    const titleRect = titleRef.current.getBoundingClientRect()
    const deltaLeft = titleRect.left - tileLeft
    const deltaRight = titleRect.right - (tileLeft + tileWidth)
    const style = { left: 0, right: 0 }
    if (deltaLeft < 0) {
      style.left = -deltaLeft + 6
    }
    if (deltaRight > 0) {
      style.right = deltaRight
    }
    setTitleBarStyle(style)
  }, [width, left, tableScrollLeft, refExists])

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
        <div className="collection-title-wrapper" ref={titleRef}>
          <motion.div
            className="collection-title"
            animate={{
              left: titleBarStyle.left,
              right: titleBarStyle.right,
            }}
            transition={{ type: "spring", stiffness: 800, damping: 120, mass: 3 }}
          >
            {`${defaultTableName} (${caseCount} cases)`}
          </motion.div>
        </div>
        <DataGrid ref={gridRef} className="rdg-light"
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          onCellClick={handleCellClick} onRowsChange={handleRowsChange}/>
      </div>
    </div>
  )
})
