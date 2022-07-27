import { observer } from "mobx-react-lite"
import React, { useCallback, useMemo } from "react"
import DataGrid, { Column, FormatterProps } from "react-data-grid"
import { DataBroker } from "../../data-model/data-broker"
import { IDataSet } from "../../data-model/data-set"

import "./case-table.scss"

type TRow = IDataSet["cases"][0]
type TColumn = Column<TRow>
type TFormatterProps = FormatterProps<TRow>

interface IProps {
  broker?: DataBroker
}
export const CaseTable: React.FC<IProps> = observer(({ broker }) => {
  const data = broker?.last

  // cell formatter/renderer
  const formatter = useCallback(({ column, row }: TFormatterProps) => {
    const value = data?.getValue(row.__id__, column.key) ?? ""
    // for now we just render the raw string value; eventually,
    // we can support other formats here (dates, colors, etc.)
    return <span>{value}</span>
  }, [data])

  // column definitions
  const columns: TColumn[] = useMemo(() => data
    ? data.attributes.map(({ id, name }) => ({
        key: id,
        name,
        resizable: true,
        formatter
      }))
    : [], [data, formatter])
  if (!data) return null

  // row definitions
  const rows = data.cases
  const rowKey = (row: typeof rows[0]) => row.__id__

  return (
    <div className="case-table" data-testid="case-table">
      <DataGrid className="rdg-light" columns={columns} rows={rows} rowKeyGetter={rowKey} />
    </div>
  )
})
