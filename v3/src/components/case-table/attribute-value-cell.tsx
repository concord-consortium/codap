import { Tooltip, VisuallyHidden } from "@chakra-ui/react"
import { useDataSet } from "../../hooks/use-data-set"
import { symParent } from "../../models/data/data-set-types"
import { t } from "../../utilities/translation/translate"
import { renderAttributeValue } from "../case-tile-common/attribute-format-utils"
import { kInputRowKey, symDom, TRenderCellProps } from "./case-table-types"
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
  const isInputRow = row.__id__ === kInputRowKey
  const caseId = isInputRow ? undefined : row.__id__
  const attr = data?.attrFromID(column.key)
  const attrName = attr?.name ?? ""
  const { value, content } = isParentCollapsed
                              ? { value: "", content: null }
                              : renderAttributeValue(strValue, numValue, attr, { key, rowHeight, caseId })
  const dataTestId = `case-table-tooltip-${row.__id__}-${column.key}`
  // Empty input-row cells don't need a tooltip (no value to show), but do need
  // screen-reader instructions. Render content + VisuallyHidden directly.
  // Normal cells pass `content` as Tooltip's single child so Popper can anchor
  // against the .cell-content div's bounding rect.
  if (isInputRow && !strValue) {
    return (
      <>
        {content}
        <VisuallyHidden>{t("V3.CaseTable.inputRowCellInstructions", { vars: [attrName] })}</VisuallyHidden>
      </>
    )
  }
  return (
    <Tooltip label={value} fontSize="12px" color="white" data-testid={dataTestId}
      openDelay={1000} placement="bottom" whiteSpace="pre-wrap" maxW="400px">
      {content}
    </Tooltip>
  )
}
