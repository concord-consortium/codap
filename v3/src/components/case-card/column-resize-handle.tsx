import React, { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

import "./column-resize-handle.scss"

interface IColumnResizeHandleProps {
  resizeWidth: number       // current handle position in px (within container)
  minLeft: number           // minimum handle position in px
  maxLeft: number           // maximum handle position in px
  onResize: (newWidth: number, isComplete?: boolean) => void
}

export const kColumnResizeHandleInteractionWidth = 10

export function ColumnResizeHandle({ resizeWidth, minLeft, maxLeft, onResize }: IColumnResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false)
  const deltaStartRef = useRef(0)
  const resizeWidthRef = useRef(resizeWidth)

  // Keep ref in sync with prop when not actively resizing
  useEffect(() => {
    if (!isResizing) {
      resizeWidthRef.current = resizeWidth
    }
  }, [resizeWidth, isResizing])

  const continueResize = useCallback((e: PointerEvent) => {
    const newWidthRaw = e.clientX - deltaStartRef.current
    const newWidth = Math.max(minLeft, Math.min(newWidthRaw, maxLeft))
    deltaStartRef.current = e.clientX - newWidth
    if (newWidth !== resizeWidthRef.current) {
      resizeWidthRef.current = newWidth
      onResize(newWidth)
    }
  }, [minLeft, maxLeft, onResize])

  const endResize = useCallback(() => {
    onResize(resizeWidthRef.current, true)
    setIsResizing(false)
  }, [onResize])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("pointermove", continueResize)
      document.addEventListener("pointerup", endResize)
      document.addEventListener("pointercancel", endResize)
      return () => {
        document.removeEventListener("pointermove", continueResize)
        document.removeEventListener("pointerup", endResize)
        document.removeEventListener("pointercancel", endResize)
      }
    }
  }, [isResizing, continueResize, endResize])

  const beginResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    deltaStartRef.current = e.clientX - resizeWidthRef.current
    setIsResizing(true)
  }, [])

  return (
    <div
      className="column-resize-handle"
      style={{ left: resizeWidth - kColumnResizeHandleInteractionWidth / 2 }}
      onPointerDown={beginResize}
    >
      <div className={clsx("column-resize-handle-divider", { "is-resizing": isResizing })} />
    </div>
  )
}
