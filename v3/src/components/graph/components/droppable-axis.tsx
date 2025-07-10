import { Active, useDroppable } from "@dnd-kit/core"
import {clsx} from "clsx"
import { observer } from "mobx-react-lite"
import React, { CSSProperties } from "react"
import { createPortal } from "react-dom"
import { AxisPlace } from "../../axis/axis-types"
import { useGraphLayoutContext } from "../hooks/use-graph-layout-context"
import { DropHint } from "../../data-display/components/drop-hint"

interface IProps {
  place: AxisPlace
  portal: HTMLElement | null
  target: SVGGElement | null
  dropId: string
  hintString?: string
  onIsActive?: (active: Active) => boolean
}
export const DroppableAxis = observer(function DroppableAxis(
  { place, portal, target, dropId, hintString, onIsActive }: IProps) {
  const layout = useGraphLayoutContext(),
    axisBounds = layout?.getComputedBounds(place)
  console.log(`--- place`, place)
  console.log(` -- computedBounds`, axisBounds)

  const { active, isOver, setNodeRef } = useDroppable({ id: dropId })
  const isActive = active && onIsActive?.(active)

  // calculate the position of the overlay
  const style: CSSProperties = { ...axisBounds }
  const classes =
    clsx("droppable-axis", "droppable-svg", place, { active: isActive, over: isActive && isOver })

  return portal && target && createPortal(
    <>
      <div ref={setNodeRef} className={classes} style={style} 
      data-testid={`add-attribute-drop-${place}`} />
      { isOver && hintString &&
        <DropHint hintText={hintString} />
      }
    </>,
    portal
  )
})
