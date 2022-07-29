import React, { useCallback, useMemo } from "react"
import { IDataSet } from "../../data-model/data-set"
import { TColumn, TFormatterProps } from "./case-table-types"

interface IUseColumnsProps {
  data?: IDataSet
  indexColumn: TColumn
}
export const useColumns = ({ data, indexColumn }: IUseColumnsProps) => {

  // cell formatter/renderer
  const cellFormatter = useCallback(({ column, row }: TFormatterProps) => {
    const value = data?.getValue(row.__id__, column.key) ?? ""
    // for now we just render the raw string value; eventually,
    // we can support other formats here (dates, colors, etc.)
    return <span>{value}</span>
  }, [data])

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
