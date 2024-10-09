import {
  AutoScrollOptions, DndContext, DragEndEvent, DragStartEvent, KeyboardCoordinateGetter, KeyboardSensor,
  MouseSensor, PointerSensor, TraversalOrder, useSensor, useSensors
} from "@dnd-kit/core"
import React, { ReactNode } from "react"
import { containerSnapToGridModifier, restrictDragToArea } from "../../hooks/use-drag-drop"
import { uiState } from "../../models/ui-state"
import { urlParams } from "../../utilities/url-params"
import { canAutoScroll } from "./dnd-can-auto-scroll"
import { dndDetectCollision } from "./dnd-detect-collision"

interface IProps {
  children: ReactNode
}
export const CodapDndContext = ({ children }: IProps) => {

  // Note that as of this writing, the auto-scroll options are not documented in the official docs,
  // but they are described in this PR: https://github.com/clauderic/dnd-kit/pull/140.
  const autoScrollOptions: AutoScrollOptions = {
    canScroll: (element, direction) => {
      // allow clients to intercede in auto-scroll determination via client-provided callbacks
      return canAutoScroll(element, direction)
    },
    // scroll components before scrolling the document
    order: TraversalOrder.ReversedTreeOrder,
    // reduce the auto-scroll area to 5% (default is 20%)
    threshold: { x: 0.05, y: 0.05 }
  }

  const handleDragStart = (event: DragStartEvent) => {
    console.log(`*** Starting drag`)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    console.log(` ** Ending drag`)
    uiState.setDraggingDatasetId()
    uiState.setDraggingAttributeId()
    uiState.setDraggingOverlayHeight()
    uiState.setDraggingOverlayWidth()
    uiState.setDraggingXOffset()
    uiState.setDraggingYOffset()
  }

  // pointer must move three pixels before starting a drag
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  // mouse sensor can be enabled for cypress tests, for instance
  // const _mouseSensor = useSensor(MouseSensor)
  // const mouseSensor = urlParams.mouseSensor ? _mouseSensor : null
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 3 } })
  const sensors = useSensors(
                    pointerSensor,
                    useSensor(KeyboardSensor, { coordinateGetter: customCoordinatesGetter }),
                    mouseSensor)
  return (
    <DndContext
      autoScroll={autoScrollOptions}
      collisionDetection={dndDetectCollision}
      modifiers={[containerSnapToGridModifier, restrictDragToArea]}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors} >
      {children}
    </DndContext>
  )
}

const customCoordinatesGetter: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
  // arrow keys move 15 pixels at a time (rather than default of 25)
  const delta = 15

  switch (event.code) {
    case 'ArrowRight':
      return {
        ...currentCoordinates,
        x: currentCoordinates.x + delta,
      }
    case 'ArrowLeft':
      return {
        ...currentCoordinates,
        x: currentCoordinates.x - delta,
      }
    case 'ArrowDown':
      return {
        ...currentCoordinates,
        y: currentCoordinates.y + delta,
      }
    case 'ArrowUp':
      return {
        ...currentCoordinates,
        y: currentCoordinates.y - delta,
      }
  }

  return undefined
}
