import { useDndContext, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { getDragAttributeInfo } from "../../hooks/use-drag-drop"
import { dragNotification } from "../../lib/dnd-kit/dnd-notifications"
import { appState } from "../../models/app-state"
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
      {draggingAttribute && <WebViewDropOverlay tileId={tile?.id ?? ""} />}
    </div>
  )
})

interface IWebViewDropOverlayProps {
  tileId: string
}
function WebViewDropOverlay({ tileId }: IWebViewDropOverlayProps) {
  const [dragOver, setDragOver] = useState(false)
  const { active, isOver, setNodeRef } = useDroppable({ id: `web-view-drop-overlay-${tileId}` })
  const info = active && getDragAttributeInfo(active)
  const dataSet = info?.dataSet
  const attributeId = info?.attributeId

  useEffect(() => {
    if (dataSet && attributeId && isOver !== dragOver) {
      const operation = isOver ? "dragenter" : "dragexit"
      appState.document.applyModelChange(() => {}, {
        notify: dragNotification(operation, dataSet, attributeId),
        webViewId: tileId
      })
      setDragOver(isOver)
    }
  }, [isOver])

  return <div className="codap-web-view-drop-overlay" ref={setNodeRef} />
}
