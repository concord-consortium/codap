import React, { useCallback, useMemo } from "react"
import { IDataSet } from "../../data-model/data-set"
import { TColumn, TFormatterProps } from "./case-table-types"

export const useColumns = (data?: IDataSet) => {
  // index cell formatter/renderer
  const indexFormatter = useCallback(({ row }: TFormatterProps) => {
    const index = data?.caseIndexFromID(row.__id__)
    return <span>{index != null ? `${index + 1}` : ""}</span>
  }, [data])

  // cell formatter/renderer
  const cellFormatter = useCallback(({ column, row }: TFormatterProps) => {
    const value = data?.getValue(row.__id__, column.key) ?? ""
    // for now we just render the raw string value; eventually,
    // we can support other formats here (dates, colors, etc.)
    return <span>{value}</span>
  }, [data])

  // index column definition
  const indexColumn: TColumn = useMemo(() => ({
    key: "__index__",
    name: "index",
    minWidth: 52,
    width: 52,
    cellClass: "codap-index-cell",
    formatter: indexFormatter
  }), [indexFormatter])

  // column definitions
  const columns: TColumn[] = useMemo(() => data
    ? [
        indexColumn,
        // attribute column definitions
        ...data.attributes.map(({ id, name }) => ({
          key: id,
          name,
          resizable: true,
          cellClass: "codap-data-cell",
          formatter: cellFormatter
        }))
    ]
    : [], [cellFormatter, data, indexColumn])

  return columns
}
