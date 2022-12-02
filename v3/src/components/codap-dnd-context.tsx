import {
  DndContext, KeyboardCoordinateGetter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from "@dnd-kit/core"
import React, { ReactNode } from "react"
import { dndDetectCollision } from "./dnd-detect-collision"

interface IProps {
  children: ReactNode
}
export const CodapDndContext = ({ children }: IProps) => {

  const sensors = useSensors(
                    // pointer must move three pixels before starting a drag
                    useSensor(PointerSensor, { activationConstraint: { distance: 3 }}),
                    useSensor(KeyboardSensor, { coordinateGetter: customCoordinatesGetter }))

  return (
    <DndContext collisionDetection={dndDetectCollision} sensors={sensors}>
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
