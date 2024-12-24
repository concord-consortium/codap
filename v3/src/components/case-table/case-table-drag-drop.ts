import {
  Active,
  Collision, CollisionDetection, DroppableContainer, UseDraggableArguments, UseDroppableArguments, closestCenter, pointerWithin, rectIntersection,
  useDndMonitor,
  useDraggable,
  useDroppable
} from "@dnd-kit/core"
import { IDragData } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"

export const kNewCollectionDropZoneBaseId = "new-collection"
export const kCollectionTableBodyDropZoneBaseId = "collection-table-body"
export const kAttributeDividerDropZoneBaseId = "attribute-divider"
export const kRowDividerDropZoneBaseId = "row-divider"

export function dropZoneRegEx(baseId: string) {
  return new RegExp(`${baseId}.+drop$`)
}

export const kNewCollectionDropZoneRegEx = dropZoneRegEx(kNewCollectionDropZoneBaseId)
export const kCollectionTableBodyDropZoneRegEx = dropZoneRegEx(kCollectionTableBodyDropZoneBaseId)
export const kAttributeDividerDropZoneRegEx = dropZoneRegEx(kAttributeDividerDropZoneBaseId)
export const kRowDividerDropZoneRegEx = dropZoneRegEx(kRowDividerDropZoneBaseId)

// filters the array of all containers down to those of a particular type
export function filterContainers(containers: DroppableContainer[], regEx: RegExp[]) {
  return containers.filter(container =>
    regEx.some(rE => rE.test(`${container.id}`))
  )
  // return containers.filter(container => regEx.test(`${container.id}`))
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

  // if the pointer is within the new collection drop zone, then we're done
  const withinCollisions = pointerWithin(args)
  const withinNewCollection = findCollision(withinCollisions, kNewCollectionDropZoneRegEx)
  if (withinNewCollection) return [withinNewCollection]

  // if the pointer is within the collection table body, find the nearest divider drop zone
  const droppableAttributeDividers = filterContainers(args.droppableContainers, [kAttributeDividerDropZoneRegEx])
  // const droppableRowDividers = filterContainers(args.droppableContainers, kRowDividerDropZoneRegEx)
  const withinTableBody = findCollision(withinCollisions, kCollectionTableBodyDropZoneRegEx)
  if (withinTableBody) {
    // use closestCenter among column dividers for moving attributes within table
    return closestCenter({ ...args, droppableContainers: droppableAttributeDividers })
  }

  const droppableRowDividers = filterContainers(args.droppableContainers, [kRowDividerDropZoneRegEx])
  // const droppableRowDividers = filterContainers(args.droppableContainers, kRowDividerDropZoneRegEx)
  const withinRowTableBody = findCollision(withinCollisions, kCollectionTableBodyDropZoneRegEx)
  if (withinRowTableBody) {
    // use closestCenter among column dividers for moving attributes within table
    return closestCenter({ ...args, droppableContainers: droppableRowDividers })
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
    // use closestCenter among column and row dividers for moving attributes within table
    return closestCenter({ ...args, droppableContainers: droppableAttributeDividers })
  }

  return []
}

// Input row dragging
export interface IDragRowData extends IDragData {
  type: "row"
  rowId: string
  collectionId: string
  // dataSet: IDataSet | undefined
  rowIdx?: number
  isInputRow: boolean
}
export interface IUseDraggableRow extends Omit<UseDraggableArguments, "id"> {
  prefix: string
  rowId: string
  collectionId: string
  // dataSet?: IDataSet
  rowIdx: number
  isInputRow: boolean
}
export const useDraggableRow = ({ prefix, rowId, rowIdx, collectionId, isInputRow, ...others }: IUseDraggableRow) => {
  const attributes = { tabIndex: -1 }
  const data: IDragRowData = { type: "row", rowId, rowIdx, collectionId, isInputRow }
  return useDraggable({ ...others, id: `${prefix}-${rowId}`, attributes, data })
}

// Collision-detection code keys on drop ids that match this convention.
// Passes its dropProps argument to useDroppable and returns an object with the return value
// of useDroppable plus the generated id.
export const useCollectionDroppable = (
  baseId: string, onDrop?: (active: Active) => void, dropProps?: UseDroppableArguments
) => {
  const instanceId = useInstanceIdContext()
  const id = `${instanceId}-${baseId}-drop`

  useRowDropHandler(id, onDrop)
  return { id, ...useDroppable({ ...dropProps, id }) }
}

export const useRowDropHandler = (dropId: string, onDrop?: (active: Active) => void) => {
  // console.log("in useRowDropHandler dropId", dropId)
  useDndMonitor({ onDragEnd: ({ active, over }) => {
      console.log("in useRowDropHandler over?.id", over?.id)

    if (over?.id === dropId) {
      onDrop?.(active)
    }
  }})
}

export const getDragRowInfo = (active: Active | null) => {
  console.log("in getDragRowInfo active", active)
  return active && active.data.current
}
