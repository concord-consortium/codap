import { observer } from "mobx-react-lite"
import React from "react"
import DataGrid from "react-data-grid"
import { DataBroker } from "../../data-model/data-broker"
import { useColumns } from "./use-columns"

import "./case-table.scss"

interface IProps {
  broker?: DataBroker
}
export const CaseTable: React.FC<IProps> = observer(({ broker }) => {
  const data = broker?.last

  const columns = useColumns(data)

  if (!data) return null

  // row definitions
  const rows = data.cases
  const rowKey = (row: typeof rows[0]) => row.__id__

  return (
    <div className="case-table" data-testid="case-table">
      {/* @ts-expect-error columns strictFunctionTypes: false */}
      <DataGrid className="rdg-light" columns={columns} rows={rows} rowKeyGetter={rowKey} />
    </div>
  )
})
