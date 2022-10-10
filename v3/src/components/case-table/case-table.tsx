import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { AttributeDragOverlay } from "./attribute-drag-overlay"
import { kIndexColumnKey, TRow } from "./case-table-types"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { prf } from "../../utilities/profiler"

import "./case-table.scss"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseTable = observer(({ setNodeRef }: IProps) => {
  const instanceId = useInstanceIdContext() || "case-table"
  const data = useDataSetContext()
  return prf.measure("Table.render", () => {

    const gridRef = useRef<DataGridHandle>(null)
    const { active } = useDndContext()
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined

    const { selectedRows, setSelectedRows, handleRowClick } = useSelectedRows({ data, gridRef })

    // columns
    const indexColumn = useIndexColumn({ data })
    const columns = useColumns({ data, indexColumn })

    // rows
    const { rows, handleRowsChange } = useRows(data)
    const rowKey = (row: TRow) => row.__id__

    if (!data) return null

    return (
      <div ref={setNodeRef} className="case-table" data-testid="case-table">
        <DataGrid ref={gridRef} className="rdg-light"
          columns={columns} rows={rows} headerRowHeight={30} rowKeyGetter={rowKey}
          rowHeight={18} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          onRowClick={handleRowClick} onRowsChange={handleRowsChange}/>
        <AttributeDragOverlay activeDragId={overlayDragId} />
      </div>
    )
  })
})
