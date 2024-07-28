import { CanScroll } from "@dnd-kit/core/dist/hooks/utilities/useAutoScroller"
import { uniqueId } from "../../utilities/js-utils"

const canAutoScrollRegistry = new Map<string, CanScroll>()

/**
 * Allows clients (e.g. tiles) to register a callback that can prevent auto-scroll
 * on particular elements (pre-existing behavior of DnDKit's `canScroll` property)
 * and depending on the direction of scroll (requires extension of DnDKit's
 * `canScroll` callback function to provide direction information).
 *
 * @param canScroll callback function that determines whether the scroll is allowed
 * @returns disposer for the callback
 */
export function registerCanAutoScrollCallback(canScroll: CanScroll) {
  const id = uniqueId()
  canAutoScrollRegistry.set(id, canScroll)
  // returns disposer so clients can unregister the callback
  return () => { canAutoScrollRegistry.delete(id) }
}

/**
 * Designed to be called by DnDKit's `canScroll` callback in its auto-scroll configuration.
 *
 * @param element element being considered for auto-scroll
 * @param direction direction of scroll
 * @returns false if autoscroll should be prevented for the specified element & direction
 */
export const canAutoScroll: CanScroll = (element, direction) => {
  // prevent auto-scroll if any handler returns false
  return !Array.from(canAutoScrollRegistry.values()).some(canScroll => canScroll(element, direction) === false)
}
