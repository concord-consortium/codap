import { clsx } from "clsx"
import { useContext } from "react"
import { createPortal } from "react-dom"
import { useDndContext } from "@dnd-kit/core"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { getJoinTip, joinSourceToDestCollection } from "../../models/data/join-datasets"
import { kJoinTargetDropZoneBaseId } from "../case-table/case-table-drag-drop"
import { AttributeHeaderDividerContext } from "./use-attribute-header-divider-context"

interface IAttributeHeaderJoinTargetProps {
  /** The attribute ID this join target is for */
  attributeId: string
  /** The parent element to position relative to */
  parentElt: HTMLElement | null
}

/**
 * A drop target overlay that appears on attribute headers when a foreign attribute is being dragged.
 * When an attribute from a different dataset is dragged over this target, it shows:
 * - A yellow highlight on the attribute header
 * - A tooltip describing the join operation
 *
 * On drop, it triggers the join operation, creating new attributes with lookupByKey formulas.
 */
function AttributeHeaderJoinTarget_({
  attributeId,
  parentElt
}: IAttributeHeaderJoinTargetProps) {
  const collectionId = useCollectionContext()
  const destDataSet = useDataSetContext()
  const containerRef = useContext(AttributeHeaderDividerContext)
  const containerElt = containerRef.current
  const { active } = useDndContext()

  // Get info about what's being dragged
  const dragInfo = getDragAttributeInfo(active)
  const sourceDataSet = dragInfo?.dataSet
  const sourceAttributeId = dragInfo?.attributeId

  // Determine if this is a valid cross-dataset drag (potential join)
  const isValidJoinDrag = !!(
    destDataSet &&
    sourceDataSet &&
    sourceAttributeId &&
    attributeId &&
    sourceDataSet !== destDataSet &&
    sourceDataSet.getAttribute(sourceAttributeId) &&
    destDataSet.getAttribute(attributeId)
  )

  // Set up the drop zone - this must always be called (React hooks rule)
  const droppableId = `${kJoinTargetDropZoneBaseId}:${collectionId}:${attributeId}`

  const { isOver, setNodeRef } = useTileDroppable(droppableId, _active => {
    const dropDragInfo = getDragAttributeInfo(_active)
    const dropSourceDataSet = dropDragInfo?.dataSet
    const dropSourceAttributeId = dropDragInfo?.attributeId

    if (!dropSourceDataSet || !dropSourceAttributeId || !destDataSet) return
    if (dropSourceDataSet === destDataSet) return

    const destCollection = destDataSet.getCollection(collectionId)
    if (!destCollection) return

    // Perform the join
    joinSourceToDestCollection({
      sourceDataSet: dropSourceDataSet,
      sourceKeyAttributeId: dropSourceAttributeId,
      destDataSet,
      destCollection,
      destKeyAttributeId: attributeId
    })
  })

  // Calculate visual state
  const isJoinDragOver = isOver && isValidJoinDrag

  // Generate join tip when hovering
  const joinTip = isJoinDragOver && sourceDataSet && sourceAttributeId && destDataSet
    ? getJoinTip(sourceDataSet, sourceAttributeId, destDataSet, attributeId)
    : ""

  // Don't render if we don't have the required elements or if no valid drag is happening
  if (!parentElt || !containerElt || !isValidJoinDrag) {
    return null
  }

  // Get the bounds of the parent element to position the overlay
  const parentRect = parentElt.getBoundingClientRect()
  const containerRect = containerElt.getBoundingClientRect()

  const bounds = {
    position: "absolute" as const,
    left: parentRect.left - containerRect.left,
    top: parentRect.top - containerRect.top,
    width: parentRect.width,
    height: parentRect.height
  }

  const className = clsx("attribute-header-join-target", { "join-drag-over": isJoinDragOver })

  return createPortal(
    <div ref={setNodeRef} className={className} style={bounds}>
      {isJoinDragOver && joinTip && (
        <div className="join-drop-tip">{joinTip}</div>
      )}
    </div>,
    containerElt
  )
}

// Not using React.memo to ensure re-renders on drag state changes
export const AttributeHeaderJoinTarget = AttributeHeaderJoinTarget_
