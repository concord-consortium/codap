import { autorun } from "mobx"
import React, { useCallback, useEffect, useState } from "react"
import { IDataSet } from "../../data-model/data-set"
import { TColumn, TFormatterProps } from "./case-table-types"
import CellTextEditor from "./cell-text-editor"
import { ColumnHeader } from "./column-header"

interface IUseColumnsProps {
  data?: IDataSet
  indexColumn: TColumn
}
export const useColumns = ({ data, indexColumn }: IUseColumnsProps) => {

  const [columns, setColumns] = useState<TColumn[]>([])

  // cell formatter/renderer
  const CellFormatter = useCallback(({ column, row }: TFormatterProps) => {
    const value = data?.getValue(row.__id__, column.key) ?? ""
    // for now we just render the raw string value; eventually,
    // we can support other formats here (dates, colors, etc.)
    return <>{value}</>
  }, [data])

  useEffect(() => {
    // rebuild column definitions when referenced properties change
    const disposer = autorun(() => {
      // column definitions
      const _columns = data
        ? [
            indexColumn,
            // attribute column definitions
            ...data.attributes.map(({ id, name }) => ({
              key: id,
              name,
              resizable: true,
              headerCellClass: "codap-column-header",
              headerRenderer: ColumnHeader,
              cellClass: "codap-data-cell",
              formatter: CellFormatter,
              editor: CellTextEditor,
              editorOptions: { editOnClick: true }
            }))
        ]
        : []
      setColumns(_columns)
    })
    return () => disposer()
  }, [CellFormatter, data, indexColumn])

  return columns
}
