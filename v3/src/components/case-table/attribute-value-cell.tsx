import { Tooltip } from "@chakra-ui/react"
import React from "react"
import { useDataSet } from "../../hooks/use-data-set"
import { symParent } from "../../models/data/data-set-types"
import { kInputRowKey, symDom, TRenderCellProps } from "./case-table-types"
import { renderAttributeValue } from "../case-tile-common/attribute-format-utils"
import { useCollectionTableModel } from "./use-collection-table-model"

export function AttributeValueCell({ column, row }: TRenderCellProps) {
  const { data, metadata } = useDataSet()
  const collectionTableModel = useCollectionTableModel()
  const rowHeight = collectionTableModel?.rowHeight
  const strValue = (data?.getStrValue(row.__id__, column.key) ?? "").trim()
  const numValue = data?.getNumeric(row.__id__, column.key)
  // if this is the first React render after performance rendering, add a
  // random key to force React to render the contents for synchronization
  const key = row[symDom]?.has(column.key) ? Math.random() : undefined
  row[symDom]?.delete(column.key)
  const isParentCollapsed = row[symParent] ? metadata?.isCollapsed(row[symParent]) : false
  // don't pass input row id to common code
  const caseId = row.__id__ === kInputRowKey ? undefined : row.__id__
  const { value, content } = isParentCollapsed
                              ? { value: "", content: null }
                              : renderAttributeValue(strValue, numValue, data?.attrFromID(column.key),
                                                      { key, rowHeight, caseId })
  return (
    <Tooltip label={value} h="20px" fontSize="12px" color="white" data-testid="case-table-data-tip"
      openDelay={1000} placement="bottom" bottom="10px" left="15px">
      {content}
    </Tooltip>
  )
}
