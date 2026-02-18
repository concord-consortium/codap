import { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

import "./column-resize-handle.scss"

interface IColumnResizeHandleProps {
  resizeWidth: number       // current left column width in px
  containerWidth: number    // total container width in px
  minWidth: number          // minimum column width in px
  onResize: (newWidth: number, isComplete?: boolean) => void
}

export const kColumnResizeHandleInteractionWidth = 10

export function ColumnResizeHandle({ resizeWidth, containerWidth, minWidth, onResize }: IColumnResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false)
  const deltaStartRef = useRef(0)
  const resizeWidthRef = useRef(resizeWidth)

  // Keep ref in sync with prop when not actively resizing
  useEffect(() => {
    if (!isResizing) {
      resizeWidthRef.current = resizeWidth
    }
  }, [resizeWidth, isResizing])

  const continueResize = useCallback((e: MouseEvent) => {
    const newWidthRaw = e.pageX - deltaStartRef.current
    const maxWidth = containerWidth - minWidth
    const newWidth = Math.max(minWidth, Math.min(newWidthRaw, maxWidth))
    deltaStartRef.current = e.pageX - newWidth
    if (newWidth !== resizeWidthRef.current) {
      resizeWidthRef.current = newWidth
      onResize(newWidth)
    }
  }, [containerWidth, minWidth, onResize])

  const endResize = useCallback(() => {
    onResize(resizeWidthRef.current, true)
    setIsResizing(false)
  }, [onResize])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", continueResize)
      document.addEventListener("mouseup", endResize)
      return () => {
        document.removeEventListener("mousemove", continueResize)
        document.removeEventListener("mouseup", endResize)
      }
    }
  }, [isResizing, continueResize, endResize])

  const beginResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    deltaStartRef.current = e.pageX - resizeWidthRef.current
    setIsResizing(true)
  }, [])

  return (
    <div
      className="column-resize-handle"
      style={{ left: resizeWidth - kColumnResizeHandleInteractionWidth / 2 }}
      onMouseDown={beginResize}
    >
      <div className={clsx("column-resize-handle-divider", { "is-resizing": isResizing })} />
    </div>
  )
}
