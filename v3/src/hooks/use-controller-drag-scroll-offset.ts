import { useDndMonitor } from "@dnd-kit/core"
import { useRef } from "react"
import { useTileContainerContext } from "./use-tile-container-context"

// Sets the scrollable container and save its scroll when a drag starts
export function useContainerDragScrollOffset() {
  const containerRef = useTileContainerContext()
  const initialScrollRef = useRef<{ left: number, top: number }>({ left: 0, top: 0 })

  useDndMonitor({
    onDragStart() {
      if (!containerRef.current) return

      initialScrollRef.current.left = containerRef.current.scrollLeft ?? 0
      initialScrollRef.current.top = containerRef.current.scrollTop ?? 0
    }
  })

  return {
    left: (containerRef.current?.scrollLeft ?? 0) - initialScrollRef.current.left,
    top: (containerRef.current?.scrollTop ?? 0) - initialScrollRef.current.top
  }
}
