import { Active, DataRef, DragEndEvent, Modifier, useDndMonitor, useDraggable, UseDraggableArguments,
    useDroppable, UseDroppableArguments} from "@dnd-kit/core"
import { useInstanceIdContext } from "./use-instance-id-context"

// list of draggable types
const DragTypes = ["attribute", "tile"] as const
type DragType = typeof DragTypes[number]

export interface IDragData {
  type: DragType
}

// Attribute Dragging

export interface IDragAttributeData extends IDragData {
  type: "attribute"
  attributeId: string
}
export function isDragAttributeData(data: DataRef): data is DataRef<IDragAttributeData> {
  return data.current?.type === "attribute"
}
export const getDragAttributeId = (active: Active | null) => {
  return active && isDragAttributeData(active.data) ? active.data.current?.attributeId : undefined
}

export interface IUseDraggableAttribute extends Omit<UseDraggableArguments, "id"> {
  // should generally include instanceId to support dragging from multiple component instances
  prefix: string
  attributeId: string
}
export const useDraggableAttribute = ({ prefix, attributeId, ...others }: IUseDraggableAttribute) => {
  // RDG expects all cells to have tabIndex of -1 except for the selected/active/clicked cell.
  // For instance, it calls scrollIntoView(gridRef.current?.querySelector('[tabindex="0"]')).
  // DnDKit sets the tabIndex of draggable elements to 0 by default for keyboard accessibility.
  // For now we set it to -1 to meet RDG's expectations and we'll worry about keyboard drag later.
  const attributes = { tabIndex: -1 }
  const data: IDragAttributeData = { type: "attribute", attributeId }
  return useDraggable({ ...others, id: `${prefix}-${attributeId}`, attributes, data })
}

// Collision-detection code uses drop overlays to identify the tile that should handle the drag.
// Passes its dropProps argument to useDroppable and returns an object with the return value
// of useDroppable plus the generated id.
export const useTileDropOverlay = (baseId?: string, dropProps?: UseDroppableArguments) => {
  const instanceId = useInstanceIdContext() || baseId
  const id = `${instanceId}-drop-overlay`
  return { id, ...useDroppable({ ...dropProps, id }) }
}

// Collision-detection code keys on drop ids that match this convention.
// Passes its dropProps argument to useDroppable and returns an object with the return value
// of useDroppable plus the generated id.
export const useTileDroppable = (
  baseId: string, onDrop: (active: Active) => void, dropProps?: UseDroppableArguments
) => {
  const instanceId = useInstanceIdContext()
  const id = `${instanceId}-${baseId}-drop`
  useDropHandler(id, onDrop)
  return { id, ...useDroppable({ ...dropProps, id }) }
}

export const useDropHandler = (dropId: string, onDrop: (active: Active) => void) => {
  useDndMonitor({ onDragEnd: ({ active, over }) => {
    // only call onDrop for the handler that registered it
    (over?.id === dropId) && onDrop(active)
  }})
}

// Tile Dragging

export interface IDragTileData extends IDragData {
  type: "tile"
  tileId: string
}

export function isDragTileData(data: DataRef): data is DataRef<IDragTileData> {
  return data.current?.type === "tile"
}

export const getDragTileId = (active: Active | null) => {
  return active && isDragTileData(active.data) ? active.data.current?.tileId : undefined
}

export interface IUseDraggableTile extends Omit<UseDraggableArguments, "id"> {
  prefix: string
  tileId: string
}
export const useDraggableTile =
  ({ prefix, tileId, ...others }: IUseDraggableTile, onStartDrag: (active: Active)=>void) => {
  const data: IDragTileData = { type: "tile", tileId }
  const dragId = `${prefix}-${tileId}`
  useTileDragStartHandler(dragId, onStartDrag)
  return useDraggable({ ...others, id: dragId, data })
}

export const useTileDragStartHandler = (dragId: string, onStartDrag: (active: Active) => void) => {
  useDndMonitor({ onDragStart: ({ active }) => {
    // only call onDragStart for the handler that registered it
    (active.id === dragId) && onStartDrag(active)
  }})
}

export const useContainerDroppable = (
  baseId: string, onDrop: (event: DragEndEvent) => void, dropProps?: UseDroppableArguments
) => {
  const id = `${baseId}-drop`

  useTileDropHandler(id, onDrop)
  return { id, ...useDroppable({ ...dropProps, id }) }
}

export const useTileDropHandler = (dropId: string, onDrop: (event: DragEndEvent) => void) => {
  useDndMonitor({ onDragEnd: (event: DragEndEvent) => {
    // only call onDrop for the handler that registered it
    (event.over?.id === dropId) && onDrop(event)
  }})
}

export const containerSnapToGridModifier: Modifier = ({transform, active}) => {
  // in pixels
  const gridSize = active && isDragTileData(active.data) ? 5 : 1
  return {
    ...transform,
    x: Math.ceil(transform.x / gridSize) * gridSize,
    y: Math.ceil(transform.y / gridSize) * gridSize,
  }
}
