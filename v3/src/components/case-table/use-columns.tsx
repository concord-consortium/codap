import { Tooltip } from "@chakra-ui/react"
import { format } from "d3"
import { autorun } from "mobx"
import React, { useCallback, useEffect, useState } from "react"
import { kDefaultFormatStr } from "../../data-model/attribute"
import { IDataSet } from "../../data-model/data-set"
import { TColumn, TFormatterProps } from "./case-table-types"
import CellTextEditor from "./cell-text-editor"
import { ColumnHeader } from "./column-header"

// cache d3 number formatters so we don't have to generate them on every render
type TNumberFormatter = (n: number) => string
const formatters = new Map<string, TNumberFormatter>()

export const getFormatter = (formatStr: string) => {
  let formatter = formatters.get(formatStr)
  if (formatStr && !formatter) {
    formatter = format(formatStr)
    formatters.set(formatStr, formatter)
  }
  return formatter
}

interface IUseColumnsProps {
  data?: IDataSet
  indexColumn: TColumn
}
export const useColumns = ({ data, indexColumn }: IUseColumnsProps) => {

  const [columns, setColumns] = useState<TColumn[]>([])

  // cell formatter/renderer
  const CellFormatter = useCallback(({ column, row }: TFormatterProps) => {
    const formatStr = data?.attrFromID(column.key)?.format || kDefaultFormatStr
    const formatter = getFormatter(formatStr)
    const str = data?.getValue(row.__id__, column.key) ?? ""
    const num = data?.getNumeric(row.__id__, column.key) ?? NaN
    const value = isFinite(num) && formatter ? formatter(num) : str
    // if this is the first React render after performance rendering, add a
    // random key to force React to render the contents for synchronization
    const key = row.__domAttrs__?.has(column.key) ? Math.random() : undefined
    row.__domAttrs__?.delete(column.key)
    // for now we just render numbers and raw string values; eventually,
    // we can support other formats here (dates, colors, etc.)
    return (
      <>
        <Tooltip label={value} backgroundColor="#e6e6e6" h="20px" fontSize="12px" color="black"
        openDelay={1000} placement="bottom" bottom="10px" left="15px">
          <span className="cell-span" key={key}>{value}</span>
        </Tooltip>
      </>
    )
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
              editor: CellTextEditor
            }))
        ]
        : []
      setColumns(_columns)
    })
    return () => disposer()
  }, [CellFormatter, data, indexColumn])

  return columns
}
