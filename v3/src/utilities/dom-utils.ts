export const scrollTileIntoView = (tileId: string) => {
  requestAnimationFrame(() => {
    const el = document.getElementById(tileId)
    if (!el) return

    // Find nearest scrollable ancestor (if null, use window)
    const getScrollContainer = (node: HTMLElement | null): HTMLElement | null => {
      let n = node?.parentElement
      while (n && n !== document.body) {
        const style = getComputedStyle(n)
        const overflowY = style.overflowY
        const overflowX = style.overflowX
        const yScrollable =
          (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
          n.scrollHeight > n.clientHeight
        const xScrollable =
          (overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") &&
          n.scrollWidth > n.clientWidth
        if (yScrollable || xScrollable) return n
        n = n.parentElement
      }
      return null
    }

    const getViewportRect = (containerElt: HTMLElement | null) =>
      containerElt
        ? containerElt.getBoundingClientRect()
        : ({ top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight,
             width: window.innerWidth, height: window.innerHeight } as DOMRect)

    const getScroll = (containerElt: HTMLElement | null) =>
      containerElt
        ? { x: containerElt.scrollLeft, y: containerElt.scrollTop }
        : { x: window.scrollX, y: window.scrollY }

    const setScroll = (containerElt: HTMLElement | null, x: number, y: number) => {
      const opts: ScrollToOptions = { left: x, top: y, behavior: "smooth" }
      if (containerElt) {
        containerElt.scrollTo(opts)
      } else {
        window.scrollTo(opts)
      }
    }

    const adjustAxis = (
      current: number,
      elemStart: number,
      elemEnd: number,
      viewStart: number,
      viewEnd: number,
      elemLargerThanView: boolean
    ) => {
      let target = current
      if (elemLargerThanView) {
        // Only move if the leading edge is clipped
        if (elemStart < viewStart) target -= (viewStart - elemStart)
      } else {
        if (elemEnd > viewEnd) target += (elemEnd - viewEnd)
        if (elemStart < viewStart) target -= (viewStart - elemStart)
      }
      return target
    }

    const container = getScrollContainer(el)
    const vRect = getViewportRect(container)
    const eRect = el.getBoundingClientRect()
    const elemLargerY = eRect.height > vRect.height
    const elemLargerX = eRect.width > vRect.width
    const { x: curX, y: curY } = getScroll(container)
    const targetY = adjustAxis(curY, eRect.top, eRect.bottom, vRect.top, vRect.bottom, elemLargerY)
    const targetX = adjustAxis(curX, eRect.left, eRect.right, vRect.left, vRect.right, elemLargerX)

    if (targetX !== curX || targetY !== curY) {
      setScroll(container, targetX, targetY)
    }
  })
}
