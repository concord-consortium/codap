import { observer } from "mobx-react-lite"
import React, { useCallback } from "react"
import DataGrid from "react-data-grid"
import { DataBroker } from "../../data-model/data-broker"
import { useColumns } from "./use-columns"
import { useSelectedRows } from "./use-selected-rows"

import "./case-table.scss"
import { useIndexColumn } from "./use-index-column"

interface IProps {
  broker?: DataBroker
}
export const CaseTable: React.FC<IProps> = observer(({ broker }) => {
  const data = broker?.last

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

  const indexColumn = useIndexColumn({ data, onIndexClick: handleIndexClick })
  const columns = useColumns({ data, indexColumn })

  if (!data) return null

  // row definitions
  const rows = data.cases
  const rowKey = (row: typeof rows[0]) => row.__id__

  return (
    <div className="case-table" data-testid="case-table">
      {/* @ts-expect-error columns strictFunctionTypes: false */}
      <DataGrid className="rdg-light" columns={columns} rows={rows} rowKeyGetter={rowKey}
        selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows} />
    </div>
  )
})
