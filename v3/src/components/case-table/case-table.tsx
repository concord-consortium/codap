import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { CSSProperties, useRef, useState } from "react"
import DataGrid, { DataGridHandle } from "react-data-grid"
import { AttributeDragOverlay } from "./attribute-drag-overlay"
import { CaseTableInspector } from "./case-table-inspector"
import { kIndexColumnKey, TRow } from "./case-table-types"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedRows } from "./use-selected-rows"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { prf } from "../../utilities/profiler"
import t from "../../utilities/translation/translate"

import styles from "./case-table-shared.scss"
import "./case-table.scss"
import "react-data-grid/lib/styles.css"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseTable = observer(({ setNodeRef }: IProps) => {
  const instanceId = useInstanceIdContext() || "case-table"
  const data = useDataSetContext()
  const [showInspector, setShowInspector] = useState(false)
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
      <>
        <div ref={setNodeRef} className="case-table" data-testid="case-table"
            onClick={()=>setShowInspector(!showInspector)}>
          <DataGrid ref={gridRef} className="rdg-light"
            columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
            rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
            onRowClick={handleRowClick} onRowsChange={handleRowsChange}/>
          <AttributeDragOverlay activeDragId={overlayDragId} />
        </div>
        <NoCasesMessage />
        <CaseTableInspector show={showInspector} />
      </>

    )
  })
})

// temporary until we have an input row
export const NoCasesMessage = () => {
  const data = useDataSetContext()
  const style: CSSProperties = {
    position: "absolute",
    top: 54,
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    fontStyle: "italic"
  }
  return !data?.cases.length
          ? <div className="no-cases-message" style={style}>{t("V3.caseTable.noCases")}</div>
          : null
}
