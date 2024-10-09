import { Active, useDroppable } from "@dnd-kit/core"
import React, { MouseEventHandler, useRef } from "react"
import { getDragAttributeInfo, useDropHandler } from "../../hooks/use-drag-drop"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { dragNotification, dragWithPositionNotification } from "../../lib/dnd-kit/dnd-notifications"

import "./web-view-drop-overlay.scss"

// The WebViewDropOverlay broadcasts notifications to plugins as the user drags and drops attributes.
export function WebViewDropOverlay() {
  const overlayRef = useRef<HTMLElement|null>()
  const { tile, tileId } = useTileModelContext()
  const dropId = `web-view-drop-overlay-${tileId}`
  const { active, setNodeRef } = useDroppable({ id: dropId })
  const info = active && getDragAttributeInfo(active)
  const dataSet = info?.dataSet
  const attributeId = info?.attributeId
  // Mouse x and y are tracked so we know where the mouse is when a dragged attribute is dropped.
  const mouseX = useRef<number|undefined>()
  const mouseY = useRef<number|undefined>()

  useDropHandler(dropId, (_active: Active) => {
    const { dataSet: dropDataSet, attributeId: dropAttributeId } = getDragAttributeInfo(_active) || {}
    if (dropDataSet && dropAttributeId && mouseX.current != null && mouseY.current != null) {
      tile?.applyModelChange(() => {}, {
        notify: dragWithPositionNotification("drop", dropDataSet, dropAttributeId, mouseX.current, mouseY.current),
        notifyTileId: tileId
      })
    }
  })

  // Only render the overlay if an attribute is being dragged
  if (!dataSet || !attributeId) return null

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = event => {
    const { top, left } = overlayRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 }
    const x = event.clientX - left
    const y = event.clientY - top

    if (mouseX.current !== x || mouseY.current !== y) {
      tile?.applyModelChange(() => {}, {
        notify: dragWithPositionNotification("drag", dataSet, attributeId, x, y),
        notifyTileId: tileId
      })
      mouseX.current = x
      mouseY.current = y
    }
  }

  const handleMouseEnterLeave = (operation: string) => {
    tile?.applyModelChange(() => {}, {
      notify: dragNotification(operation, dataSet, attributeId),
      notifyTileId: tileId
    })
  }

  const setRef = (ref: HTMLDivElement) => {
    overlayRef.current = ref
    setNodeRef(ref)
  }

  return <div
    className="codap-web-view-drop-overlay"
    onMouseEnter={() => handleMouseEnterLeave("dragenter")}
    onMouseLeave={() => handleMouseEnterLeave("dragleave")}
    onMouseMove={handleMouseMove}
    ref={setRef}
  />
}
