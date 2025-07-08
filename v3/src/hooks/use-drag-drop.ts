import {
  Active, DataRef, useDndMonitor, useDraggable, UseDraggableArguments, useDroppable, UseDroppableArguments
} from "@dnd-kit/core"
import { IDataSet } from "../models/data/data-set"
import { useInstanceIdContext } from "./use-instance-id-context"
import { useTileSelectionContext } from "./use-tile-selection-context"

// list of draggable types
export const DragTypes = ["attribute", "row", "tile"] as const
type DragType = typeof DragTypes[number]

export interface IDragData {
  type: DragType
}

// Attribute Dragging

export interface IDragAttributeData extends IDragData {
  type: "attribute"
  dataSet: IDataSet | undefined
  attributeId: string
}
export function isDragAttributeData(data: DataRef): data is DataRef<IDragAttributeData> {
  return data.current?.type === "attribute"
}
export function getDragAttributeInfo(active: Active | null): Omit<IDragAttributeData, "type"> | undefined {
  const { dataSet, attributeId } = active?.data.current as IDragAttributeData || {}
  return dataSet && attributeId ? { dataSet, attributeId } : undefined
}

export interface IUseDraggableAttribute extends Omit<UseDraggableArguments, "id"> {
  // should generally include instanceId to support dragging from multiple component instances
  prefix: string
  dataSet?: IDataSet
  attributeId: string
}
export const useDraggableAttribute = ({ prefix, dataSet, attributeId, ...others }: IUseDraggableAttribute) => {
  // RDG expects all cells to have tabIndex of -1 except for the selected/active/clicked cell.
  // For instance, it calls scrollIntoView(gridRef.current?.querySelector('[tabindex="0"]')).
  // DnDKit sets the tabIndex of draggable elements to 0 by default for keyboard accessibility.
  // For now we set it to -1 to meet RDG's expectations and we'll worry about keyboard drag later.
  const attributes = { tabIndex: -1 }
  const data: IDragAttributeData = { type: "attribute", dataSet, attributeId }
  return useDraggable({ ...others, id: `${prefix}-${attributeId}`, attributes, data })
}

// Collision-detection code uses drop overlays to identify the tile that should handle the drag.
// Passes its dropProps argument to useDroppable and returns an object with the return value
// of useDroppable plus the generated id.
export const useTileDropOverlay = (baseId: string, dropProps?: UseDroppableArguments) => {
  const id = `${baseId}-drop-overlay`
  return { id, ...useDroppable({ ...dropProps, id }) }
}

// Collision-detection code keys on drop ids that match this convention.
// Passes its dropProps argument to useDroppable and returns an object with the return value
// of useDroppable plus the generated id.
export const useTileDroppable = (
  baseId: string, onDrop?: (active: Active) => void, dropProps?: Omit<UseDroppableArguments, "id">
) => {
  const instanceId = useInstanceIdContext()
  const id = `${instanceId}-${baseId}-drop`
  useDropHandler(id, onDrop)
  return { id, ...useDroppable({ ...dropProps, id }) }
}

export const useDropHandler = (dropId: string, onDrop?: (active: Active) => void) => {
  const { selectTile } = useTileSelectionContext()
  useDndMonitor({ onDragEnd: ({ active, over }) => {
    // only call onDrop for the handler that registered it
    if (over?.id === dropId) {
      onDrop?.(active)
      selectTile()
    }
  }})
}
