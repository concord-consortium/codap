import {
  AutoScrollOptions, DndContext, KeyboardCoordinateGetter, KeyboardSensor,
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

  // pointer must move three pixels before starting a drag
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  // Codap uses both a pointer and mouse sensor to enable synthetic drags via plugin API requests.
  // The mouseSensor url parameter is used for cypress tests, which won't work if there's a distance requirement
  const mouseOptions = urlParams.mouseSensor !== undefined ? undefined : { activationConstraint: { distance: 3 } }
  const mouseSensor = useSensor(MouseSensor, mouseOptions)
  const sensors = useSensors(
                    pointerSensor,
                    useSensor(KeyboardSensor, { coordinateGetter: customCoordinatesGetter }),
                    mouseSensor)
  return (
    <DndContext
      autoScroll={autoScrollOptions}
      collisionDetection={dndDetectCollision}
      modifiers={[containerSnapToGridModifier, restrictDragToArea]}
      onDragEnd={() => uiState.endDrag()}
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
