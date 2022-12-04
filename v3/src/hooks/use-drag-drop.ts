import { Active, DataRef, useDndMonitor, useDraggable, UseDraggableArguments } from "@dnd-kit/core"

// list of draggable types
const DragTypes = ["attribute"] as const
type DragType = typeof DragTypes[number]

export interface IDragData {
  type: DragType
}

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

export const useDropHandler = (dropId: string, onDrop: (active: Active) => void) => {
  useDndMonitor({ onDragEnd: ({ active, over }) => {
    // only call onDrop for the handler that registered it
    (over?.id === dropId) && onDrop(active)
  }})
}
