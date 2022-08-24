/**
 * Graph Custom Hooks
 */
import {useEffect} from "react"

interface IDragHandlers {
  start: (event: MouseEvent) => void
  drag: (event: MouseEvent) => void
  end: (event: MouseEvent) => void
}

export const useDragHandlers = (target: any, {start, drag, end}: IDragHandlers) => {
  useEffect(() => {
    target.addEventListener('mousedown', start)
    target.addEventListener('mousemove', drag)
    target.addEventListener('mouseup', end)
    // On cleanup, remove event listeners
    return () => {
      target.removeEventListener('mousedown', start)
      target.removeEventListener('mousemove', drag)
      target.removeEventListener('mouseup', end)
    }
  }, [target, start, drag, end])
}

