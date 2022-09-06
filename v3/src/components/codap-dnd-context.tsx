import {
  DndContext, DragEndEvent, DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors
} from "@dnd-kit/core"
import React, { ReactNode } from "react"
import { dndDetectCollision } from "./dnd-detect-collision"

interface IProps {
  children: ReactNode
}
export const CodapDndContext = ({ children }: IProps) => {

  function handleDragStart(evt: DragStartEvent) {
    // console.log("DnDKit [handleDragStart]")
  }

  function handleDragEnd(evt: DragEndEvent) {
    const {active, over} = evt
    if (over?.data?.current?.accepts.includes(active?.data?.current?.type)) {
      over.data.current.onDrop?.(active)
    }
  }

  const sensors = useSensors(
                    // pointer must move three pixels before starting a drag
                    useSensor(PointerSensor, { activationConstraint: { distance: 3 }}),
                    useSensor(KeyboardSensor))

  return (
    <DndContext collisionDetection={dndDetectCollision} sensors={sensors}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  )
}
