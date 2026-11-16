import { findLongestContentWidth } from "../case-tile-common/attribute-format-utils"
import { ICaseTableModel } from "./case-table-model"
import { kCellPadding } from "./case-table-types"

export function resizeAllColumns(tableModel: ICaseTableModel) {
  const data = tableModel.data
  if (!data) return
  const newColumnWidths = new Map<string, number>()
  data.collections.forEach((collection) => {
    collection.attributes.forEach((attr) => {
      if (attr) {
        const longestContentWidth = findLongestContentWidth(attr)
        newColumnWidths.set(attr.id, Math.ceil(longestContentWidth + kCellPadding))
      }
    })
  })
  tableModel.setColumnWidths(newColumnWidths)
}
