export const isMac = navigator.platform.toLowerCase().includes("mac")

export const cmdKey = isMac ? "Meta" : "Control"

/*
 * The modifier flags shared by React, DOM, d3, and Leaflet events, so every caller can pass its own
 * event without converting it. Leaflet callers pass `event.originalEvent`.
 */
export interface IModifierKeys {
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

export function isCommandKeyDown(event: IModifierKeys) {
  return (isMac && !!event.metaKey) || (!isMac && !!event.ctrlKey)
}

/*
 * Whether a click should adjust the selection instead of replacing it.
 *
 * Selection targets in the graph, map, and legend are nominal: there is no meaningful span between
 * two categories or two plotted points, so there is nothing for shift to extend that cmd would not
 * do. Every modifier therefore means one thing -- toggle this target in or out. Ordered targets
 * like case table rows are the exception; they read shift separately to extend an anchored range.
 *
 * ctrl counts only off the Mac, where it is not the secondary-click gesture. alt is excluded
 * because it is already spoken for: option-click zooms the plot background and rescales axes.
 *
 * Every caller routes through here so that supporting context menus, or deciding ctrl should toggle
 * on the Mac after all, is a single edit.
 */
export function hasSelectionModifier(event: IModifierKeys) {
  return !!event.shiftKey || isCommandKeyDown(event)
}

/*
 * Whether a click should leave an existing selection alone rather than clearing it. Deliberately
 * more permissive than hasSelectionModifier: acting on a selection should be precise, but
 * destroying one should not happen while the user holds any modifier at all -- including ctrl on a
 * Mac, where the click is opening a context menu rather than asking us to clear.
 */
export function preservesSelection(event: IModifierKeys) {
  return !!event.shiftKey || !!event.metaKey || !!event.ctrlKey
}
