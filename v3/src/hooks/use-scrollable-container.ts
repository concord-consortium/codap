import { useDndMonitor } from '@dnd-kit/core'

const initialScroll = { left: 0, top: 0 }
let scrollableContainer: HTMLElement | null = null

// Sets the scrollable container and save its scroll when a drag starts
export function useScrollableContainer(element: HTMLElement | null) {
  scrollableContainer = element

  useDndMonitor({
    onDragStart() {
      if (!element) return

      initialScroll.left = element.scrollLeft ?? 0
      initialScroll.top = element.scrollTop ?? 0
    }
  })
}

// Returns the difference between the current scroll and the scroll when the drag started
export function getScrollDifference() {
  return {
    left: (scrollableContainer?.scrollLeft ?? 0) - initialScroll.left,
    top: (scrollableContainer?.scrollTop ?? 0) - initialScroll.top
  }
}
