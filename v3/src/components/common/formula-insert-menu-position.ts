// keeps a menu clear of the window edge it is placed against
const kWindowMargin = 8

export interface IButtonMetrics {
  top: number
  bottom: number
  height: number
}

export interface IMenuPlacement {
  top?: number
  bottom?: number
  maxHeight: number
}

/**
 * Places a dropdown against the button that opens it, flush with the button's edge.
 *
 * Below the button by preference, above it when the menu does not fit below but does fit above,
 * and on the roomier side when it fits neither. The returned maxHeight never exceeds the space on
 * the chosen side, so the menu scrolls rather than running past the edge of the window.
 *
 * Shared by the insert values and insert function menus so the two cannot drift apart.
 */
export function getMenuPlacement(
  button: IButtonMetrics, contentHeight: number, maxHeight: number, windowHeight: number
): IMenuPlacement {
  const spaceBelow = windowHeight - button.bottom - kWindowMargin
  const spaceAbove = button.top - kWindowMargin
  // the menu is never drawn taller than its cap, so that is the height that has to fit
  const height = Math.min(contentHeight, maxHeight)
  const fitsBelow = height <= spaceBelow
  const fitsAbove = height <= spaceAbove
  const placeBelow = fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove)
  const available = Math.max(placeBelow ? spaceBelow : spaceAbove, 0)

  return {
    [placeBelow ? "top" : "bottom"]: button.height,
    maxHeight: Math.min(maxHeight, available)
  }
}

export function isSamePlacement(a: IMenuPlacement | undefined, b: IMenuPlacement) {
  return a?.top === b.top && a?.bottom === b.bottom && a?.maxHeight === b.maxHeight
}
