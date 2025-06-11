import { Active, DragEndEvent, DragStartEvent, useDndMonitor, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { MouseEventHandler, useRef } from "react"
import { IFullNotification } from "../../data-interactive/notification-full-types"
import { getDragAttributeInfo, useDropHandler } from "../../hooks/use-drag-drop"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import {
  dragEndNotification, dragNotification, dragStartNotification, dragWithPositionNotification
} from "../../lib/dnd-kit/dnd-notifications"
import { IDataSet } from "../../models/data/data-set"
import { uiState } from "../../models/ui-state"

import "./web-view-drop-overlay.scss"

// The WebViewDropOverlay broadcasts notifications to plugins as the user drags and drops attributes.
export const WebViewDropOverlay = observer(function WebViewDropOverlay() {
  const overlayRef = useRef<HTMLElement|null>()
  const { tile, tileId } = useTileModelContext()
  const dropId = `web-view-drop-overlay-${tileId}`
  const { active, setNodeRef } = useDroppable({ id: dropId })
  const info = active && getDragAttributeInfo(active)
  const dataSet = info?.dataSet
  const attributeId = info?.attributeId
  const isDraggingAttribute = !!dataSet && !!attributeId
  const { isDraggingTile } = uiState
  // Mouse x and y are tracked so we know where the mouse is when a dragged attribute is dropped.
  const mouseX = useRef<number|undefined>()
  const mouseY = useRef<number|undefined>()

  const sendNotification = (notification: IFullNotification) => {
    const { message, callback } = notification
    tile?.content.broadcastMessage(message, callback ?? (() => null))
  }

  // Broadcast dragstart and dragend notifications
  const handleDragStartEnd = (
    notification: (dataSet: IDataSet, attributeId: string) => IFullNotification, _active: Active
  ) => {
    const _info = getDragAttributeInfo(_active)
    if (_info?.dataSet && _info.attributeId) {
      sendNotification(
        notification(_info.dataSet, _info.attributeId)
      )
    }
  }

  useDndMonitor({
    onDragStart: (e: DragStartEvent) => handleDragStartEnd(dragStartNotification, e.active),
    onDragEnd: (e: DragEndEvent) => handleDragStartEnd(dragEndNotification, e.active)
  })

  // Broadcast drop notifications
  useDropHandler(dropId, (_active: Active) => {
    const { dataSet: dropDataSet, attributeId: dropAttributeId } = getDragAttributeInfo(_active) || {}
    if (dropDataSet && dropAttributeId && mouseX.current != null && mouseY.current != null) {
      sendNotification(
        dragWithPositionNotification("drop", dropDataSet, dropAttributeId, mouseX.current, mouseY.current)
      )
    }
  })

  // Only render the overlay if an attribute or tile is being dragged
  if ((!dataSet || !attributeId) && !isDraggingTile) return null

  // Broadcast drag notifications
  const handlePointerMove: MouseEventHandler<HTMLDivElement> = event => {
    const { top, left } = overlayRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 }
    const x = event.clientX - left
    const y = event.clientY - top

    if (mouseX.current !== x || mouseY.current !== y) {
      if (isDraggingAttribute) {
        sendNotification(
          dragWithPositionNotification("drag", dataSet, attributeId, x, y)
        )
      }
      mouseX.current = x
      mouseY.current = y
    }
  }

  // Broadcast dragenter and dragleave notifications
  const handlePointerEnterLeave = (operation: string) => {
    if (isDraggingAttribute) {
      sendNotification(
        dragNotification(operation, dataSet, attributeId)
      )
    }
  }

  const setRef = (ref: HTMLDivElement) => {
    overlayRef.current = ref
    setNodeRef(ref)
  }

  return <div
    className="codap-web-view-drop-overlay"
    onPointerEnter={() => handlePointerEnterLeave("dragenter")}
    onPointerLeave={() => handlePointerEnterLeave("dragleave")}
    onPointerMove={handlePointerMove}
    ref={setRef}
  />
})
