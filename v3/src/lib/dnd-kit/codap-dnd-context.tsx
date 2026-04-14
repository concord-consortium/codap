import {
  Active, Announcements, AutoScrollOptions, DndContext, KeyboardCoordinateGetter, KeyboardSensor,
  MouseSensor, PointerSensor, TraversalOrder, useSensor, useSensors
} from "@dnd-kit/core"
import { ReactNode, useMemo } from "react"
import { dataInteractiveState } from "../../data-interactive/data-interactive-state"
import { getDragAttributeInfo } from "../../hooks/use-drag-drop"
import { t } from "../../utilities/translation/translate"
import { urlParams } from "../../utilities/url-params"
import { canAutoScroll } from "./dnd-can-auto-scroll"
import { dndDetectCollision } from "./dnd-detect-collision"

interface IProps {
  children: ReactNode
}

const getAttrName = (active: Active | null) => {
  const info = getDragAttributeInfo(active)
  return info?.dataSet?.attrFromID(info.attributeId)?.name ?? ""
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

  const announcements: Announcements = useMemo(() => ({
    onDragStart({ active }) {
      return t("V3.DnD.onDragStart", { vars: [getAttrName(active)] })
    },
    onDragOver() { return undefined },
    onDragEnd({ active }) {
      return t("V3.DnD.onDragEnd", { vars: [getAttrName(active)] })
    },
    onDragCancel({ active }) {
      return t("V3.DnD.onDragCancel", { vars: [getAttrName(active)] })
    }
  }), [])

  const useMouseSensor = useSensor(MouseSensor)
  const sensors = useSensors(
                    // pointer must move three pixels before starting a drag
                    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
                    useSensor(KeyboardSensor, { coordinateGetter: customCoordinatesGetter }),
                    // mouse sensor can be enabled for cypress tests, for instance
                    urlParams.mouseSensor !== undefined ? useMouseSensor : null
  )
  return (
    <DndContext
      accessibility={{ announcements }}
      autoScroll={autoScrollOptions}
      collisionDetection={dndDetectCollision}
      onDragEnd={() => dataInteractiveState.endDrag()}
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
