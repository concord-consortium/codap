import { ICollectionModel } from "../../models/data/collection"
import { findLongestContentWidth } from "../case-tile-common/attribute-format-utils"
import { ICaseTableModel } from "./case-table-model"
import { kCellPadding } from "./case-table-types"

/**
 * Returns the collections the case table renders, in parent-to-child order. Collections at either
 * end of the hierarchy whose attributes are all hidden are omitted, since such a grid would show
 * only the index column. A middle collection is kept so the relationship lines on either side of it
 * have rows to connect. If no collection has a visible attribute, the childmost collection is
 * rendered on its own, so a table with everything hidden still shows its cases.
 */
export function getRenderedCollections(collections: ICollectionModel[], isHidden: (attrId: string) => boolean) {
  const hasVisibleAttribute = (collection: ICollectionModel) =>
    collection.attributes.some(attr => attr && !isHidden(attr.id))
  const first = collections.findIndex(hasVisibleAttribute)
  if (first < 0) return collections.slice(-1)
  let last = collections.length - 1
  while (!hasVisibleAttribute(collections[last])) --last
  return collections.slice(first, last + 1)
}

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
