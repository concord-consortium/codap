import { Active, DataRef, useDraggable, UseDraggableArguments } from "@dnd-kit/core"

// list of draggable types
const DragTypes = ["attribute"] as const
type DragType = typeof DragTypes[number]

export interface IDragData {
  type: DragType
}

export interface IDropData {
  accepts: DragType[]
  onDrop?: (active: Active) => void
}

export interface IDragAttributeData {
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
  const data: IDragAttributeData = { type: "attribute", attributeId }
  return useDraggable({ ...others, id: `${prefix}-${attributeId}`, data })
}
