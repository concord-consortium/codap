import { useDndContext, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { AttributeDragOverlay } from "./attribute-drag-overlay"
import { TRow } from "./case-table-types"
import { DataBroker } from "../../data-model/data-broker"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { prf } from "../../utilities/profiler"

import "./case-table.scss"

interface IProps {
  broker?: DataBroker
}
export const CaseTable: React.FC<IProps> = observer(({ broker }) => {
  return prf.measure("Table.render", () => {
    const data = broker?.last

    const gridRef = useRef<DataGridHandle>(null)
    const { active } = useDndContext()
    const { setNodeRef } = useDroppable({ id: "case-table-drop", data: { accepts: ["attribute"] } })

    const { selectedRows, setSelectedRows, handleRowClick } = useSelectedRows({ data, gridRef })

    // columns
    const indexColumn = useIndexColumn({ data })
    const columns = useColumns({ data, indexColumn })

    // rows
    const { rows, handleRowsChange } = useRows(data)
    const rowKey = (row: TRow) => row.__id__

    if (!data) return null

    return (
      <DataSetContext.Provider value={data}>
        <div ref={setNodeRef} className="case-table" data-testid="case-table">
          <DataGrid ref={gridRef} className="rdg-light"
            columns={columns} rows={rows} rowKeyGetter={rowKey}
            selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
            onRowClick={handleRowClick} onRowsChange={handleRowsChange}/>
          <AttributeDragOverlay activeDragAttrId={`${active?.id}`} column={active?.data?.current?.column} />
        </div>
      </DataSetContext.Provider>
    )
  })
})
