import { useDndContext, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useCallback } from "react"
import DataGrid from "react-data-grid"
import { AttributeDragOverlay } from "./attribute-drag-overlay"
import { TRow } from "./case-table-types"
import { DataBroker } from "../../data-model/data-broker"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"

import "./case-table.scss"

interface IProps {
  broker?: DataBroker
}
export const CaseTable: React.FC<IProps> = observer(({ broker }) => {
  const data = broker?.last

  const { active } = useDndContext()
  const { setNodeRef } = useDroppable({ id: "case-table-drop", data: { accepts: ["attribute"] } })

  const [selectedRows, setSelectedRows] = useSelectedRows(data)

  const handleIndexClick = useCallback((caseId: string, evt: React.MouseEvent) => {
    // for now, all modifiers result in disjoint selection
    // shift-key range selection requires last-click anchor logic
    const isExtending = evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey
    const isCaseSelected = data?.isCaseSelected(caseId)
    if (isExtending) {
      data?.selectCases([caseId], !isCaseSelected)
    }
    else if (!isCaseSelected) {
      data?.setSelectedCases([caseId])
    }
  }, [data])

  // columns
  const indexColumn = useIndexColumn({ data, onClick: handleIndexClick })
  const columns = useColumns({ data, indexColumn })

  // rows
  const { rows, handleRowsChange } = useRows(data)
  const rowKey = (row: TRow) => row.__id__

  if (!data) return null

  return (
    <DataSetContext.Provider value={data}>
      <div ref={setNodeRef} className="case-table" data-testid="case-table">
        <DataGrid className="rdg-light" columns={columns} rows={rows} rowKeyGetter={rowKey}
          selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows} onRowsChange={handleRowsChange}/>
        <AttributeDragOverlay activeDragAttrId={`${active?.id}`} column={active?.data?.current?.column} />
      </div>
    </DataSetContext.Provider>
  )
})
