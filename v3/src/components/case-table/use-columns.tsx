import { Tooltip } from "@chakra-ui/react"
import parseColor from "color-parse"
import { format } from "d3"
import { comparer } from "mobx"
import React, { useCallback, useEffect, useState } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { IAttribute, kDefaultFormatStr } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { symParent } from "../../models/data/data-set-types"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { parseColorStrict } from "../../utilities/color-parse-strict"
import { mstReaction } from "../../utilities/mst-reaction"
import { kDefaultColumnWidth, symDom, TColumn, TRenderCellProps } from "./case-table-types"
import CellTextEditor from "./cell-text-editor"
import { ColumnHeader } from "./column-header"

// cache d3 number formatters so we don't have to generate them on every render
type TNumberFormatter = (n: number) => string
const formatters = new Map<string, TNumberFormatter>()

export const getNumFormatter = (formatStr: string) => {
  let formatter = formatters.get(formatStr)
  if (formatStr && !formatter) {
    formatter = format(formatStr)
    formatters.set(formatStr, formatter)
  }
  return formatter
}

export function renderValue(str = "", num = NaN, attr?: IAttribute) {
  const { type, userType } = attr || {}

  // colors
  if ((type === "color" && parseColor(str).space) || (!userType && parseColorStrict(str).space)) {
    return (
      <div className="cell-color-swatch" >
        <div className="cell-color-swatch-center" style={{ background: str }} />
      </div>
    )
  }

  // numbers
  if (isFinite(num)) {
    const formatStr = attr?.format ?? kDefaultFormatStr
    const formatter = getNumFormatter(formatStr)
    if (formatter) return formatter(num)
  }

  return str
}

interface IUseColumnsProps {
  data?: IDataSet
  indexColumn?: TColumn
}
export const useColumns = ({ data, indexColumn }: IUseColumnsProps) => {
  const caseMetadata = useCaseMetadata()
  const parentCollection = useParentCollectionContext()
  const collectionId = useCollectionContext()
  const [columns, setColumns] = useState<TColumn[]>([])

  // cell renderer
  const RenderCell = useCallback(function({ column, row }: TRenderCellProps) {
    const str = (data?.getStrValue(row.__id__, column.key) ?? "").trim()
    const isParentCollapsed = row[symParent] ? caseMetadata?.isCollapsed(row[symParent]) : false
    const output = isParentCollapsed
                    ? ""
                    : renderValue(str, data?.getNumeric(row.__id__, column.key), data?.attrFromID(column.key))
    const tooltip = typeof output === "string" ? output : str
    // if this is the first React render after performance rendering, add a
    // random key to force React to render the contents for synchronization
    const key = row[symDom]?.has(column.key) ? Math.random() : undefined
    row[symDom]?.delete(column.key)
    return (
      <Tooltip label={tooltip} h="20px" fontSize="12px" color="white" data-testid="case-table-data-tip"
        openDelay={1000} placement="bottom" bottom="10px" left="15px">
        <span className="cell-span" key={key}>{output}</span>
      </Tooltip>
    )
  }, [caseMetadata, data])

  useEffect(() => {
    // rebuild column definitions when referenced properties change
    return mstReaction(
      () => {
        const collection = data?.getCollection(collectionId)
        const attrs: IAttribute[] = collection ? getCollectionAttrs(collection, data) : []
        const visible: IAttribute[] = attrs.filter(attr => attr && !caseMetadata?.isHidden(attr.id))
        return visible.map(({ id, name, type, isEditable }) => ({ id, name, type, isEditable }))
      },
      entries => {
        // column definitions
        const _columns: TColumn[] = data
          ? [
              ...(indexColumn ? [indexColumn] : []),
              // attribute column definitions
              ...entries.map(({ id, name, isEditable }): TColumn => ({
                key: id,
                name,
                // If a default column width isn't supplied, RDG defaults to "auto",
                // which leads to undesirable browser behavior.
                width: kDefaultColumnWidth,
                resizable: true,
                headerCellClass: "codap-column-header",
                renderHeaderCell: ColumnHeader,
                cellClass: "codap-data-cell",
                renderCell: RenderCell,
                renderEditCell: isEditable ? CellTextEditor : undefined
              }))
          ]
          : []
        setColumns(_columns)
      },
      { name: "useColumns [rebuild columns]", equals: comparer.structural, fireImmediately: true }, data
    )
  }, [RenderCell, caseMetadata, collectionId, data, indexColumn, parentCollection])

  return columns
}
