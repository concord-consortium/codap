import {
  AutoScrollOptions, DndContext, DragEndEvent, DragStartEvent, KeyboardCoordinateGetter, KeyboardSensor,
  MouseSensor, PointerSensor, TraversalOrder, useSensor, useSensors
} from "@dnd-kit/core"
import React, { ReactNode } from "react"
import { containerSnapToGridModifier, getDragAttributeInfo, restrictDragToArea } from "../../hooks/use-drag-drop"
import { appState } from "../../models/app-state"
import { uiState } from "../../models/ui-state"
import { urlParams } from "../../utilities/url-params"
import { canAutoScroll } from "./dnd-can-auto-scroll"
import { dndDetectCollision } from "./dnd-detect-collision"
import { dragEndNotification, dragStartNotification } from "./dnd-notifications"

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

  const handleDragEnd = (e: DragEndEvent) => {
    if (uiState.draggingDataSet && uiState.draggingAttributeId) {
      appState.document.applyModelChange(() => {}, {
        notify: dragEndNotification(uiState.draggingDataSet, uiState.draggingAttributeId)
      })
    }
    uiState.setDraggingDataSet()
    uiState.setDraggingAttributeId()
  }

  const handleDragStart = (e: DragStartEvent) => {
    const info = getDragAttributeInfo(e.active)
    if (info?.dataSet) {
      const { dataSet, attributeId } = info
      uiState.setDraggingDataSet(dataSet)
      uiState.setDraggingAttributeId(attributeId)
      appState.document.applyModelChange(() => {}, {
        notify: dragStartNotification(dataSet, attributeId)
      })
    }
  }

  const useMouseSensor = useSensor(MouseSensor)
  const sensors = useSensors(
                    // pointer must move three pixels before starting a drag
                    useSensor(PointerSensor, { activationConstraint: { distance: 3 }}),
                    useSensor(KeyboardSensor, { coordinateGetter: customCoordinatesGetter }),
                    // mouse sensor can be enabled for cypress tests, for instance
                    urlParams.mouseSensor !== undefined ? useMouseSensor : null)
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
