import { Tooltip } from "@chakra-ui/react"
import { format } from "d3"
import { reaction } from "mobx"
import React, { useCallback, useEffect, useState } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { IAttribute, kDefaultFormatStr } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { symParent } from "../../models/data/data-set-types"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { symDom, TColumn, TFormatterProps } from "./case-table-types"
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
  indexColumn?: TColumn
}
export const useColumns = ({ data, indexColumn }: IUseColumnsProps) => {
  const caseMetadata = useCaseMetadata()
  const parentCollection = useParentCollectionContext()
  const collection = useCollectionContext()
  const [columns, setColumns] = useState<TColumn[]>([])

  // cell formatter/renderer
  const CellFormatter = useCallback(({ column, row }: TFormatterProps) => {
    const formatStr = data?.attrFromID(column.key)?.format || kDefaultFormatStr
    const formatter = getFormatter(formatStr)
    const str = data?.getValue(row.__id__, column.key) ?? ""
    const num = data?.getNumeric(row.__id__, column.key) ?? NaN
    const value = isFinite(num) && formatter ? formatter(num) : str
    const isParentCollapsed = row[symParent] ? caseMetadata?.isCollapsed(row[symParent]) : false
    const output = isParentCollapsed ? "" : value
    // if this is the first React render after performance rendering, add a
    // random key to force React to render the contents for synchronization
    const key = row[symDom]?.has(column.key) ? Math.random() : undefined
    row[symDom]?.delete(column.key)
    // for now we just render numbers and raw string values; eventually,
    // we can support other formats here (dates, colors, etc.)
    return (
      <Tooltip label={value} h="20px" fontSize="12px" color="white" data-testid="case-table-data-tip"
        openDelay={1000} placement="bottom" bottom="10px" left="15px">
        <span className="cell-span" key={key}>{output}</span>
      </Tooltip>
    )
  }, [caseMetadata, data])

  useEffect(() => {
    // rebuild column definitions when referenced properties change
    const disposer = reaction(
      () => {
        const attrs: IAttribute[] = getCollectionAttrs(collection, data)
        const visible: IAttribute[] = attrs.filter(attr => attr && !caseMetadata?.isHidden(attr.id))
        return visible.map(({ id, name, editable }) => ({ id, name, editable }))
      },
      entries => {
        // column definitions
        const _columns: TColumn[] = data
          ? [
              ...(indexColumn ? [indexColumn] : []),
              // attribute column definitions
              ...entries.map(({ id, name, editable }) => ({
                key: id,
                name,
                resizable: true,
                headerCellClass: "codap-column-header",
                headerRenderer: ColumnHeader,
                cellClass: "codap-data-cell",
                formatter: CellFormatter,
                editor: editable ? CellTextEditor : undefined
              }))
          ]
          : []
        setColumns(_columns)
      },
      { fireImmediately: true }
    )
    return () => disposer()
  }, [CellFormatter, caseMetadata, collection, data, indexColumn, parentCollection])

  return columns
}
