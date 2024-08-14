import { Tooltip } from "@chakra-ui/react"
import { format } from "d3"
import { comparer } from "mobx"
import React, { useCallback, useEffect, useState } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { IAttribute, kDefaultFormatStr } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { symParent } from "../../models/data/data-set-types"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { parseColor } from "../../utilities/color-utils"
import { mstReaction } from "../../utilities/mst-reaction"
import { isCaseEditable, respectEditableItemAttribute } from "../../utilities/plugin-utils"
import { kDefaultColumnWidth, symDom, TColumn, TRenderCellProps } from "./case-table-types"
import CellTextEditor from "./cell-text-editor"
import ColorCellTextEditor from "./color-cell-text-editor"
import { ColumnHeader } from "./column-header"
import { isBrowserISOString, parseDate } from "../../utilities/date-parser"
import { DatePrecision, formatDate } from "../../utilities/date-utils"

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

export function renderValue(str = "", num = NaN, attr?: IAttribute, key?: number) {
  const { type, userType } = attr || {}

  // colors
  const color = type === "color" || !userType ? parseColor(str, { colorNames: type === "color" }) : ""
  if (color) {
    return {
      value: color,
      content: (
        <div className="cell-color-swatch" key={key}>
          <div className="cell-color-swatch-interior" style={{ background: color }} />
        </div>
      )
    }
  }

  // numbers
  if (isFinite(num)) {
    const formatStr = attr?.format ?? kDefaultFormatStr
    const formatter = getNumFormatter(formatStr)
    if (formatter) str = formatter(num)
  }

  // Dates
  // Note that CODAP v2 formats dates in the case table ONLY if the user explicitly specifies the type as "date".
  // Dates are not interpreted as dates and formatted by default. However, V3 adds one exception to this rule:
  // if the date string is strictly an ISO string produced by the browser's Date.toISOString(), it will be treated as
  // a Date object that should be formatted. The main reason for this is to format the results of date formulas.
  // This is because CODAP v3 stores all the case values as strings natively, and we cannot simply check if the value
  // is an instance of the `Date` class (as it will never be). Date.toISOString() is the native way of serializing dates
  // in CODAP v3 (check `importValueToString` from attribute.ts).
  if (isBrowserISOString(str) || userType === "date" && str !== "") {
    const date = parseDate(str, true)
    if (date) {
      // TODO: add precision support for date formatting
      const formattedDate = formatDate(date, DatePrecision.None)
      console.log(`ooo date`, date)
      return {
        value: str,
        content: <span className="cell-span" key={key}>{formattedDate || `"${str}"`}</span>
      }
    } else {
      // If the date is not valid, wrap it in quotes (CODAP V2 behavior).
      str = `"${str}"`
    }
  }

  console.log(`ooo str`, str)
  return {
    value: str,
    content: <span className="cell-span" key={key}>{str}</span>
  }
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
    const strValue = (data?.getStrValue(row.__id__, column.key) ?? "").trim()
    const numValue = data?.getNumeric(row.__id__, column.key)
    // if this is the first React render after performance rendering, add a
    // random key to force React to render the contents for synchronization
    const key = row[symDom]?.has(column.key) ? Math.random() : undefined
    row[symDom]?.delete(column.key)
    const isParentCollapsed = row[symParent] ? caseMetadata?.isCollapsed(row[symParent]) : false
    const { value, content } = isParentCollapsed
                                ? { value: "", content: null }
                                : renderValue(strValue, numValue, data?.attrFromID(column.key), key)
    return (
      <Tooltip label={value} h="20px" fontSize="12px" color="white" data-testid="case-table-data-tip"
        openDelay={1000} placement="bottom" bottom="10px" left="15px">
        {content}
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
        console.log(`~~~ managingControllerId`, data?.managingControllerId)
        return {
          entries: visible.map(({ id, name, type, userType, isEditable }) => ({ id, name, type, userType, isEditable })),
          managingController: data?.managingControllerId
        }
      },
      ({ entries }) => {
        console.log(`--- reaction`)
        // column definitions
        const _columns: TColumn[] = data
          ? [
              ...(indexColumn ? [indexColumn] : []),
              // attribute column definitions
              ...entries.map(({ id, name, userType, isEditable }): TColumn => ({
                key: id,
                name,
                // If a default column width isn't supplied, RDG defaults to "auto",
                // which leads to undesirable browser behavior.
                width: kDefaultColumnWidth,
                resizable: true,
                headerCellClass: `codap-column-header`,
                renderHeaderCell: ColumnHeader,
                cellClass: "codap-data-cell",
                renderCell: RenderCell,
                editable: row => {
                  console.log(`--- row`, row)
                  console.log(` -- isCaseEditable`, isCaseEditable(data, row.__id__))
                  console.log(` -- isEditable`, isEditable)
                  return isCaseEditable(data, row.__id__)
                },
                renderEditCell: isEditable
                                  // if users haven't assigned a non-color type, then color swatches
                                  // may be displayed and should be edited with swatches.
                                  ? userType == null || userType === "color" ? ColorCellTextEditor : CellTextEditor
                                  : undefined
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
