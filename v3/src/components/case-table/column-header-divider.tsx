import React, { CSSProperties, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { IAttribute } from "../../models/data/attribute"
import { isCollectionModel } from "../../models/data/collection"
import { IMoveAttributeOptions } from "../../models/data/data-set-types"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeId, useTileDroppable } from "../../hooks/use-drag-drop"
import { kIndexColumnKey } from "./case-table-types"

interface IProps {
  columnKey: string
  cellElt: HTMLElement | null
}
export const ColumnHeaderDivider = ({ columnKey, cellElt }: IProps) => {
  const collection = useCollectionContext()
  const collectionId = collection?.id || "child-most"
  const droppableId = `attribute-divider:${collectionId}:${columnKey}`
  const data = useDataSetContext()
  const [tableElt, setTableElt] = useState<HTMLElement | null>(null)
  const tableBounds = tableElt?.getBoundingClientRect()
  const cellBounds = cellElt?.getBoundingClientRect()

  const { isOver, setNodeRef: setDropRef } = useTileDroppable(droppableId, active => {
    const dragAttrId = getDragAttributeId(active)
    if (!data || !dragAttrId) return

    const srcCollection = data.getCollectionForAttribute(dragAttrId)
    const firstAttr: IAttribute | undefined = getCollectionAttrs(collection)[0]
    const options: IMoveAttributeOptions = columnKey === kIndexColumnKey
                                            ? { before: firstAttr?.id }
                                            : { after: columnKey }
    if (collection === srcCollection) {
      if (isCollectionModel(collection)) {
        // move the attribute within a collection
        collection.moveAttribute(dragAttrId, options)
      }
      else {
        // move an ungrouped attribute within the DataSet
        data.moveAttribute(dragAttrId, options)
      }
    }
    else {
      // move the attribute to a new collection
      data.setCollectionForAttribute(dragAttrId, { collection: collection?.id, ...options })
    }
  })

  // find the `case-table` DOM element; divider must be drawn relative
  // to the `case-table` (via React portal) so it isn't clipped by the cell
  useEffect(() => {
    if (cellElt && !tableElt) {
      let parent: HTMLElement | null
      for (parent = cellElt; parent; parent = parent.parentElement) {
        if (parent.classList.contains("case-table")) {
          setTableElt(parent)
          break
        }
      }
    }
  }, [cellElt, tableElt])

  // compute the divider position relative to the `case-table` element
  const kDividerWidth = 7
  const kDividerOffset = Math.floor(kDividerWidth / 2)
  const style: CSSProperties = tableBounds && cellBounds
                  ? {
                      top: cellBounds.top - tableBounds.top,
                      height: cellBounds.height,
                      left: cellBounds.right - tableBounds.left - kDividerOffset - 1,
                      width: kDividerWidth
                    }
                  : {}

  return tableElt && tableBounds && cellBounds && (cellBounds?.right < tableBounds?.right)
          ? createPortal((
              <div ref={setDropRef} className={`codap-column-header-divider ${isOver ? "over" : ""}`} style={style}/>
            ), tableElt)
          : null
}
