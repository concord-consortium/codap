import { Active, useDndContext, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { MouseEventHandler, useEffect, useRef, useState } from "react"
import { getDragAttributeInfo, useDropHandler } from "../../hooks/use-drag-drop"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { dragNotification, dragWithPositionNotification } from "../../lib/dnd-kit/dnd-notifications"
import { getTileInfo } from "../../models/document/tile-utils"
import { t } from "../../utilities/translation/translate"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { useDataInteractiveController } from "./use-data-interactive-controller"
import { isWebViewModel } from "./web-view-model"

import "./web-view.scss"

export const WebViewComponent = observer(function WebViewComponent({ tile }: ITileBaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const webViewModel = tile?.content
  const { active } = useDndContext()
  const info = getDragAttributeInfo(active)
  const draggingAttribute = info?.attributeId && info.dataSet

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
      {draggingAttribute && <WebViewDropOverlay />}
    </div>
  )
})

function WebViewDropOverlay() {
  const mouseX = useRef<number|undefined>()
  const mouseY = useRef<number|undefined>()
  const { tile, tileId } = useTileModelContext()
  const dropId = `web-view-drop-overlay-${tileId}`
  const [dragOver, setDragOver] = useState(false)
  const { active, isOver, setNodeRef } = useDroppable({ id: dropId })
  const info = active && getDragAttributeInfo(active)
  const dataSet = info?.dataSet
  const attributeId = info?.attributeId
  const { position } = getTileInfo(tileId ?? "")
  const tileX = position?.left ?? 0
  // TODO Hardcoded header heights
  const kDocumentHeaderHeight = 94
  const kTileHeaderHeight = 25
  const tileY = (position?.top ?? 0) + kDocumentHeaderHeight + kTileHeaderHeight

  const handleMouseOver: MouseEventHandler<HTMLDivElement> = event => {
    const { clientX, clientY } = event
    const x = clientX - tileX
    const y = clientY - tileY
    console.log(`--- handleMouseMove`, x, y)
    if (dataSet && attributeId && (mouseX.current !== x || mouseY.current !== y)) {
      tile?.applyModelChange(() => {}, {
        notify: dragWithPositionNotification("drag", dataSet, attributeId, x, y),
        webViewId: tileId
      })
    }
    mouseX.current = x
    mouseY.current = y
  }

  useDropHandler(dropId, (_active: Active) => {
    const { dataSet: dropDataSet, attributeId: dropAttributeId } = getDragAttributeInfo(_active) || {}
    if (dropDataSet && dropAttributeId && mouseX.current != null && mouseY.current != null) {
      tile?.applyModelChange(() => {}, {
        notify: dragWithPositionNotification("drop", dropDataSet, dropAttributeId, mouseX.current, mouseY.current),
        webViewId: tileId
      })
    }
  })

  useEffect(() => {
    if (dataSet && attributeId && isOver !== dragOver) {
      const operation = isOver ? "dragenter" : "dragleave"
      tile?.applyModelChange(() => {}, {
        notify: dragNotification(operation, dataSet, attributeId),
        webViewId: tileId
      })
      setDragOver(isOver)
    }
  }, [isOver])

  return <div
    className="codap-web-view-drop-overlay"
    onMouseOver={handleMouseOver}
    ref={setNodeRef}
  />
}
