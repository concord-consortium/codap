import {
  Active, Collision, CollisionDescriptor, CollisionDetection, DroppableContainer, UseDraggableArguments,
  closestCenter, pointerWithin, rectIntersection, useDraggable
} from "@dnd-kit/core"
import { IDragData } from "../../hooks/use-drag-drop"
import { kInputRowKey } from "./case-table-types"

export const kNewCollectionDropZoneBaseId = "new-collection"
export const kCollectionTableBodyDropZoneBaseId = "collection-table-body"
export const kAttributeDividerDropZoneBaseId = "attribute-divider"
export const kRowDividerDropZoneBaseId = "row-divider"
export const kJoinTargetDropZoneBaseId = "join-target"

export function dropZoneRegEx(baseId: string) {
  return new RegExp(`${baseId}.+drop$`)
}

export const kNewCollectionDropZoneRegEx = dropZoneRegEx(kNewCollectionDropZoneBaseId)
export const kCollectionTableBodyDropZoneRegEx = dropZoneRegEx(kCollectionTableBodyDropZoneBaseId)
export const kAttributeDividerDropZoneRegEx = dropZoneRegEx(kAttributeDividerDropZoneBaseId)
export const kRowDividerDropZoneRegEx = dropZoneRegEx(kRowDividerDropZoneBaseId)
export const kJoinTargetDropZoneRegEx = dropZoneRegEx(kJoinTargetDropZoneBaseId)

// filters containers by collectionId
export function filterCollection(containers: DroppableContainer[], collectionId: string) {
  return containers.filter(container => String(container.id).includes(collectionId))
}

// filters the array of all containers down to those of a particular type
export function filterContainers(containers: DroppableContainer[], regEx: RegExp) {
  return containers.filter(container => regEx.test(`${container.id}`))
}

// returns the first collision with a particular drop zone type
export function findCollision(collisions: Collision[], regEx: RegExp) {
  return collisions.find(collision => regEx.test(`${collision.id}`))
}

// returns the index of the first collision with a particular drop zone type
export function findCollisionIndex(collisions: Collision[], regEx: RegExp) {
  return collisions.findIndex(collision => regEx.test(`${collision.id}`))
}

export const caseTableCollisionDetection: CollisionDetection = (args) => {
  // Rectangle intersection results are biased towards the new collection drop zones.
  // Therefore, we start by checking pointer within for more precise intersections.
  // But pointer within doesn't work for accessible fallbacks like the keyboard sensor.
  // https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms#pointer-within
  // Therefore, we also provide fallback to rectangle intersection if pointer within doesn't fire.

  const withinCollisions = pointerWithin(args)
  const withinTableBody = findCollision(withinCollisions, kCollectionTableBodyDropZoneRegEx)

  // input row drag
  if (withinTableBody && String(args.active.id).includes(kInputRowKey)) {
    const dragRowInfo = getDragRowInfo(args.active)
    if (dragRowInfo) {
      // use closestVerticalCenter among row dividers for dragging the input row
      const droppableCollection = filterCollection(args.droppableContainers, dragRowInfo.collectionId)
      const droppableRowDividers = filterContainers(droppableCollection, kRowDividerDropZoneRegEx)
      return closestVerticalCenter({ ...args, droppableContainers: droppableRowDividers })
    }
  }
  // attribute drag
  else {
    // if the pointer is within the new collection drop zone, then we're done
    const withinNewCollection = findCollision(withinCollisions, kNewCollectionDropZoneRegEx)
    if (withinNewCollection) return [withinNewCollection]

    // check for join target drop zones (for cross-dataset attribute drops)
    const withinJoinTarget = findCollision(withinCollisions, kJoinTargetDropZoneRegEx)
    if (withinJoinTarget) return [withinJoinTarget]

    // if the pointer is within the collection table body, find the nearest attribute divider drop zone
    const droppableColumnDividers = filterContainers(args.droppableContainers, kAttributeDividerDropZoneRegEx)
    if (withinTableBody) {
      // use closestCenter among column dividers for moving attributes within table
      return closestCenter({ ...args, droppableContainers: droppableColumnDividers })
    }

    // if the pointer within tests didn't find a target, try rectangle intersection
    const intersectCollisions = rectIntersection(args)
    // intersection collisions are ordered by percentage of overlap, so check order
    const intersectNewCollectionIndex = findCollisionIndex(intersectCollisions, kNewCollectionDropZoneRegEx)
    const intersectTableBodyIndex = findCollisionIndex(intersectCollisions, kCollectionTableBodyDropZoneRegEx)
    const intersectsNewCollection = intersectNewCollectionIndex >= 0
    const intersectsTableBody = intersectTableBodyIndex >= 0

    // return the new collection intersection if it's more salient than the collection body intersection
    if (intersectsNewCollection && (!intersectsTableBody || intersectNewCollectionIndex < intersectTableBodyIndex)) {
      return [intersectCollisions[intersectNewCollectionIndex]]
    }
    if (intersectsTableBody) {
      // use closestCenter among column dividers for moving attributes within table
      return closestCenter({ ...args, droppableContainers: droppableColumnDividers })
    }
  }
  return []
}

// Input row dragging
export interface IDragRowData extends IDragData {
  type: "row"
  rowId: string
  collectionId: string
  rowIdx?: number
  isInputRow: boolean
}
export interface IUseDraggableRow extends Omit<UseDraggableArguments, "id"> {
  prefix: string
  rowId: string
  collectionId: string
  rowIdx: number
  isInputRow: boolean
}
export const useDraggableRow = ({ prefix, rowId, rowIdx, collectionId, isInputRow, ...others }: IUseDraggableRow) => {
  const attributes = { tabIndex: -1 }
  const data: IDragRowData = { type: "row", rowId, rowIdx, collectionId, isInputRow }
  return useDraggable({ ...others, id: `${prefix}-${collectionId}-${rowId}`, attributes, data })
}

export const getDragRowInfo = (active: Active | null) => {
  return active?.data.current
}

/**
 * Returns the closest vertical center to the pointer position or collision rectangle.
 */
export const closestVerticalCenter: CollisionDetection = ({
  collisionRect,
  droppableRects,
  droppableContainers,
  pointerCoordinates
}) => {
  // use pointer coordinates if available; collisionRect seems off in some cases
  const dragY = pointerCoordinates?.y ?? collisionRect.top + collisionRect.height / 2
  const collisions: CollisionDescriptor[] = []

  for (const droppableContainer of droppableContainers) {
    const {id} = droppableContainer
    const rect = droppableRects.get(id)

    if (rect) {
      const droppableY = rect.top + rect.height / 2
      const distBetween = Math.abs(dragY - droppableY)

      collisions.push({id, data: {droppableContainer, value: distBetween}})
    }
  }

  return collisions.sort((a, b) => a.data.value - b.data.value)
}
