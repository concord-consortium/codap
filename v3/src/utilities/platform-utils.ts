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
 * Whether a click should toggle its target in or out of the selection instead of replacing it.
 *
 * Meant for unordered targets such as legend categories: with no meaningful span for shift to
 * extend, shift and the command key mean the same thing. Ordered targets like case table rows read
 * shift separately to extend an anchored range.
 *
 * The command key is cmd on a Mac and ctrl elsewhere; on a Mac, ctrl-click is the secondary-click
 * gesture. alt is excluded because option-click zooms the plot background and rescales axes.
 * Route modifier checks through here and preservesSelection rather than reading the flags
 * directly, so a change in modifier policy is a single edit.
 */
export function hasSelectionModifier(event: IModifierKeys) {
  return !!event.shiftKey || isCommandKeyDown(event)
}

/*
 * Whether a click should leave an existing selection alone rather than clearing it. Deliberately
 * more permissive than hasSelectionModifier: acting on a selection should be precise, but any of
 * shift, cmd, or ctrl on either platform keeps a click from destroying one -- including ctrl on a
 * Mac, where the click opens a context menu. alt is excluded, as in hasSelectionModifier.
 */
export function preservesSelection(event: IModifierKeys) {
  return !!event.shiftKey || !!event.metaKey || !!event.ctrlKey
}
