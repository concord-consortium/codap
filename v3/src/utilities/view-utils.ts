import { kDefaultTileHeight, kDefaultTileWidth } from "../components/constants"

const kCodapAppHeader = 95
const kTitleBarHeight = 25
const kGap = 5 // Also used to increment during search

export const getPositionOfNewComponent = (iViewRect: {width?: number, height?: number}, iPosition = "top") => {
  // note that this will only work when the document content is a single FreeTileRow
  const parentEl = document.getElementsByClassName("free-tile-row")
  if (!parentEl?.[0]) return { x: 100, y: 100 }
  const rowRect = parentEl[0].getBoundingClientRect()
  const existingEls = document.getElementsByClassName("free-tile-component")
  const existingRects = Array.from(existingEls).map(el => el.getBoundingClientRect())
  const viewWidth = iViewRect.width || kDefaultTileWidth
  const viewHeight = iViewRect.height || kDefaultTileHeight


  const findEmptyLocationForRect = () => {
    const iOffset = {x: 0, y: 0}
    const tStartAtBottom = (iPosition === 'bottom')
    let tLoc = {x: kGap + iOffset.x,
          y: (tStartAtBottom ? rowRect.height - viewHeight - kGap : kGap) + iOffset.y }
    let tSuccess = false

    const intersectRect = (r1: {x: number, y: number, width: number, height: number},
        r2: {x: number, y: number, width: number, height: number}) => {
      const tRes = (!isNaN(r1.x) && !isNaN(r1.y)) && !(r2.x > r1.x + r1.width ||
          r2.x + r2.width < r1.x ||
          r2.y > r1.y + r1.height ||
          r2.y + r2.height < r1.y - kTitleBarHeight - kGap)
      return tRes
    }

    /*  intersects - Iterate through iViews, returning true for the first view
    that intersects iItemRect placed at the given location, false
    if none intersect.
    */
    const intersects = (iTopLeft: {x: number, y: number}) => {
      return !existingRects.every(rect => {
        return !intersectRect(rect,
                              { x: iTopLeft.x,
                                y: iTopLeft.y + kCodapAppHeader,
                                width: viewWidth,
                                height: viewHeight
                              })
        })
    }

    const onTopOfViewRectTopLeft = (iTopLeft: {x: number, y: number}) => {
      return !existingRects.every(rect => {
        return !(iTopLeft.x === rect.x && iTopLeft.y + kCodapAppHeader === rect.y)
      })
    }

    // If there are no other views or reserved areas, simply return the initial
    // candidate.
    if (existingRects.length === 0) {
      return tLoc
    }

    // Work our way through the visible portion of the document
    while (!tSuccess && (tLoc.y + viewHeight < rowRect.height) &&
              tLoc.y >= iOffset.y + kGap) {
      tLoc.x = iOffset.x + kGap
      // left to right, making sure we got through at least once
      while (!tSuccess) {
        // Positioned at tLoc, does the item rect intersect any view rects?
        if (intersects(tLoc)) {
          tLoc.x += kGap
          if (tLoc.x + viewWidth > iOffset.x + rowRect.x + rowRect.width)
            { break }
        }
        else {
          tSuccess = true
        }
      }
      !tSuccess && (tLoc.y += (tStartAtBottom ? -kGap : kGap))
    }

    if (!tSuccess) {
      // Choose a location that will center the item rect in the container
      tLoc = {  x: iOffset.x +
                    Math.max(kGap, Math.round((rowRect.width - viewWidth) / 2)),
                y: iOffset.y +
                    Math.max(kGap, Math.round((rowRect.height - viewHeight) / 2))
              }
      // Adjust down and to the right until there tLoc is not on top of the upper-right corner of a view rect
      while (!tSuccess) {
        if (!onTopOfViewRectTopLeft(tLoc)) {
          tSuccess = true
        } else {
          tLoc = { x: tLoc.x + kGap, y: tLoc.y + kTitleBarHeight }
        }
      }
    }
    return tLoc
  }

  const nLoc = findEmptyLocationForRect()
  return nLoc
}

export const isWithinBounds = (panelRight: number, palette: HTMLDivElement | null) => {
  if (!palette) return false
  const paletteRect = palette.getBoundingClientRect()
  const viewportEl = palette.closest(".tile-row")
  if (!viewportEl) return false
  const viewportRect = viewportEl.getBoundingClientRect()
  return (panelRight + paletteRect.width + 10) < viewportRect.right
}

export const getPaletteTopPosition = (tempTop: number, paletteHeight: number, pointerMid: number) => {
  const top = pointerMid-paletteHeight/2
  if ((tempTop+top) > kCodapAppHeader + kGap) {
    return top
  } else {
    return 0
  }
}
