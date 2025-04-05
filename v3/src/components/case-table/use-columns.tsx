import { comparer } from "mobx"
import { useEffect, useState } from "react"
import { clsx } from "clsx"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetMetadata } from "../../hooks/use-data-set-metadata"
import { IAttribute } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { mstReaction } from "../../utilities/mst-reaction"
import { isCaseEditable } from "../../utilities/plugin-utils"
import { AttributeValueCell } from "./attribute-value-cell"
import { kDefaultColumnWidth, kDefaultRowHeight, TColumn } from "./case-table-types"
import CellTextEditor from "./cell-text-editor"
import ColorCellTextEditor from "./color-cell-text-editor"
import { ColumnHeader } from "./column-header"
import { useCollectionTableModel } from "./use-collection-table-model"

interface IUseColumnsProps {
  data?: IDataSet
  indexColumn?: TColumn
}
export const useColumns = ({ data, indexColumn }: IUseColumnsProps) => {
  const metadata = useDataSetMetadata()
  const collectionTableModel = useCollectionTableModel()
  const collectionId = useCollectionContext()
  const [columns, setColumns] = useState<TColumn[]>([])
  const rowHeight = collectionTableModel?.rowHeight ?? kDefaultRowHeight

  useEffect(() => {
    // rebuild column definitions when referenced properties change
    const isEditableAttr = (attrId: string) => metadata?.isEditable(attrId) ?? true
    return mstReaction(
      () => {
        const collection = data?.getCollection(collectionId)
        const attrs: IAttribute[] = collection ? getCollectionAttrs(collection, data) : []
        const visible: IAttribute[] = attrs.filter(attr => attr && !metadata?.isHidden(attr.id))
        return visible.map(({ id, name, type, userType, hasFormula, precision }) =>
                  ({ id, name, type, userType, isEditable: isEditableAttr(id), hasFormula, precision }))
      },
      entries => {
        // column definitions
        const _columns: TColumn[] = data
          ? [
              ...(indexColumn ? [indexColumn] : []),
              // attribute column definitions
              ...entries.map(({ id, name, userType, isEditable, hasFormula }): TColumn => ({
                key: id,
                name,
                // If a default column width isn't supplied, RDG defaults to "auto",
                // which leads to undesirable browser behavior.
                width: kDefaultColumnWidth,
                resizable: true,
                headerCellClass: `codap-column-header`,
                renderHeaderCell: ColumnHeader,
                cellClass: row => clsx("codap-data-cell", `rowId-${row.__id__}`,
                                        {"formula-column": hasFormula, "multi-line": rowHeight > kDefaultRowHeight}),
                renderCell: AttributeValueCell,
                editable: row => isCaseEditable(data, row.__id__),
                renderEditCell: isEditable
                                  // if users haven't assigned a non-color type, then color swatches
                                  // may be displayed and should be edited with swatches.
                                  ? userType == null || userType === "color"
                                      ? ColorCellTextEditor
                                      : CellTextEditor
                                  : undefined
              }))
          ]
          : []
        setColumns(_columns)
      },
      { name: "useColumns [rebuild columns]", equals: comparer.structural, fireImmediately: true }, data
    )
  }, [collectionId, data, indexColumn, metadata, rowHeight])

  return columns
}
