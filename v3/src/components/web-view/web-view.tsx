import { Active, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { MouseEventHandler, useRef } from "react"
import { getDragAttributeInfo, useDropHandler } from "../../hooks/use-drag-drop"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { dragNotification, dragWithPositionNotification } from "../../lib/dnd-kit/dnd-notifications"
import { t } from "../../utilities/translation/translate"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { useDataInteractiveController } from "./use-data-interactive-controller"
import { isWebViewModel } from "./web-view-model"

import "./web-view.scss"

export const WebViewComponent = observer(function WebViewComponent({ tile }: ITileBaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const webViewModel = tile?.content

  useDataInteractiveController(iframeRef, tile)

  if (!isWebViewModel(webViewModel)) return null

  return (
    <div className="codap-web-view-body" data-testid="codap-web-view">
      {!webViewModel.isPlugin && (
        <div className="codap-web-view-backdrop">
          <div className="codap-web-view-url">{webViewModel.url}</div>
          <div className="codap-web-view-message">{t("DG.GameView.loadError")}</div>
        </div>
      )}
      <div className="codap-web-view-iframe-wrapper">
        <iframe className="codap-web-view-iframe" ref={iframeRef} src={webViewModel.url} />
      </div>
      <WebViewDropOverlay />
    </div>
  )
})

// The WebViewDropOverlay broadcasts notifications to plugins as the user drags and drops attributes.
function WebViewDropOverlay() {
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
        webViewId: tileId
      })
    }
  })

  if (!dataSet || !attributeId) return null

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = event => {
    const { top, left } = overlayRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 }
    const x = event.clientX - left
    const y = event.clientY - top

    if (mouseX.current !== x || mouseY.current !== y) {
      tile?.applyModelChange(() => {}, {
        notify: dragWithPositionNotification("drag", dataSet, attributeId, x, y),
        webViewId: tileId
      })
      mouseX.current = x
      mouseY.current = y
    }
  }

  const handleMouseEnterLeave = (operation: string) => {
    tile?.applyModelChange(() => {}, {
      notify: dragNotification(operation, dataSet, attributeId),
      webViewId: tileId
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
