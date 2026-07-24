import { Active, useDroppable } from "@dnd-kit/core"
import {clsx} from "clsx"
import { observer } from "mobx-react-lite"
import { CSSProperties } from "react"
import { createPortal } from "react-dom"
import { AxisPlace } from "../../axis/axis-types"
import { DropHint } from "../../data-display/components/drop-hint"
import { useGraphLayoutContext } from "../hooks/use-graph-layout-context"

interface IProps {
  place: AxisPlace
  portal: HTMLElement | null
  target: SVGGElement | null
  dropId: string
  hintString?: string
  onIsActive?: (active: Active) => boolean
  // shrinks the rect from the top so it doesn't overlap an adjacent add-attribute drop zone
  topInset?: number
}
export const DroppableAxis = observer(function DroppableAxis(
  { place, portal, target, dropId, hintString, onIsActive, topInset = 0 }: IProps) {
  const layout = useGraphLayoutContext(),
    axisBounds = layout?.getComputedBounds(place)

  const { active, isOver, setNodeRef } = useDroppable({ id: dropId })
  const isActive = active && onIsActive?.(active)

  // calculate the position of the overlay, applying topInset to avoid overlap
  const style: CSSProperties = { ...axisBounds }
  if (topInset > 0 && axisBounds) {
    style.top = (axisBounds.top ?? 0) + topInset
    style.height = Math.max(0, (axisBounds.height ?? 0) - topInset)
  }
  const classes =
    clsx("droppable-axis", "droppable-svg", place, { active: isActive, over: isActive && isOver })

  return portal && target && createPortal(
    <>
      <div ref={setNodeRef} className={classes} style={style} data-testid={`add-attribute-drop-${place}`} />
      <DropHint hintText={hintString} isVisible={isOver} />
    </>,
    portal
  )
})
