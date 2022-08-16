import { useCallback, useRef } from "react"

interface IActiveScroll {
  startPos: number
  endPos: number
  startTime: number
}

const kDefaultScrollDuration = 500
const kDefaultScrollThrottle = 30 // >30ms => <=30Hz

interface ScrollOptions {
  duration: number
  throttle: number
}

export function useRowScrolling(gridElt: HTMLDivElement | null | undefined, rowHeight = 35) {

  const activeScroll = useRef<IActiveScroll>({ startPos: 0, endPos: 0, startTime: 0 })
  const rafRequestId = useRef(0)

  const getRowTop = useCallback((rowIndex: number) => rowIndex * rowHeight, [rowHeight])

  // smoothly scroll the grid so that the specified row is at the top
  const scrollToRow = useCallback((rowIndex: number, options?: ScrollOptions) => {
    if (!gridElt) return

    const { duration = kDefaultScrollDuration, throttle = kDefaultScrollThrottle } = options || {}

    // initialize (or update) the scroll parameters to the desired target
    activeScroll.current = {
      startPos: gridElt.scrollTop,
      endPos: getRowTop(rowIndex),
      startTime: 0
    }
    // we already have an in-flight request, no need to add another
    // scroll parameters were updated above to the new target
    if (rafRequestId.current) return
    // nothing to do
    if (activeScroll.current.startPos === activeScroll.current.endPos) return

    let lastTime = 0
    function rafScrollStep(time: DOMHighResTimeStamp) {
      const { startPos, endPos, startTime } = activeScroll.current
      if (!startTime) {
        // first time -- initialize start times
        activeScroll.current.startTime = lastTime = time
        return rafRequestId.current = requestAnimationFrame(rafScrollStep)
      }
      else {
        const elapsed = time - lastTime
        if (elapsed < throttle) {
          // not enough time has elapsed -- throttle until next time
          return rafRequestId.current = requestAnimationFrame(rafScrollStep)
        }
        else {
          // scroll to the appropriate position based on the elapsed time
          const elapsedPct = Math.min(1, elapsed / duration)
          gridElt && (gridElt.scrollTop = Math.round(startPos + (endPos - startPos) * elapsedPct))
          if (elapsedPct < 1) {
            // if we're not finished, schedule another frame
            return rafRequestId.current = requestAnimationFrame(rafScrollStep)
          }
        }
      }
      // no in-flight request
      rafRequestId.current = 0
    }
    rafRequestId.current = requestAnimationFrame(rafScrollStep)
  }, [getRowTop, gridElt])

  const scrollRowIntoView = useCallback((rowIndex: number, options?: ScrollOptions) => {
    if (!gridElt) return
    const gridBounds = gridElt.getBoundingClientRect()
    const visibleRows = gridBounds.height / rowHeight
    const rowTop = getRowTop(rowIndex)
    const rowBottom = getRowTop(rowIndex + 1)
    const viewTop = gridElt.scrollTop
    const viewBottom = viewTop + gridBounds.height
    // is row already visible?
    if (rowTop >= viewTop && rowBottom <= viewBottom) return
    // scroll up?
    if (rowTop < viewTop) {
      scrollToRow(Math.max(0, rowIndex - 1), options)
    }
    else if (rowBottom > viewBottom) {
      scrollToRow(Math.max(0, Math.floor(rowIndex - visibleRows) + 3), options)
    }
  }, [getRowTop, gridElt, rowHeight, scrollToRow])

  const scrollClosestRowIntoView = useCallback((rowIndices: number[], options?: ScrollOptions) => {
    if (!gridElt) return
    const gridBounds = gridElt.getBoundingClientRect()
    const viewTop = gridElt.scrollTop
    const viewBottom = viewTop + gridBounds.height
    let closestRow = -1
    let distance = Infinity
    for (let i = 0; i < rowIndices.length; ++i) {
      const rowIndex = rowIndices[i]
      const rowTop = getRowTop(rowIndex)
      const rowBottom = getRowTop(rowIndex + 1)
      // at least one row is already visible, no scroll required
      if (rowTop >= viewTop && rowBottom <= viewBottom) return
      if (rowTop < viewTop) {
        if (viewTop - rowTop < distance) {
          closestRow = rowIndex
          distance = viewTop - rowTop
        }
      }
      if (rowTop > viewBottom) {
        if (rowTop - viewBottom < distance) {
          closestRow = rowIndex
          distance = rowTop - viewBottom
        }
      }
    }
    if (closestRow >= 0) {
      scrollRowIntoView(closestRow, options)
    }
  }, [getRowTop, gridElt, scrollRowIntoView])

  return { scrollToRow, scrollRowIntoView, scrollClosestRowIntoView }
}
