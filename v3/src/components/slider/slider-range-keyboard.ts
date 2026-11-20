// The range slider's keyboard model. The range is a single keyboard stop: the arrow keys move the whole range,
// keeping its width, and Alt+Left/Right resizes it from its upper edge. A collapsed range moves as a point through
// the data's values, as it does when dragged.

export interface IRangeKeyContext {
  low: number
  high: number
  // the axis bounds
  min: number
  max: number
  step: number
  pageSize: number
  // the bound attribute's sorted distinct values, which a collapsed range moves through; a function, since only a
  // collapsed range needs them and they take a pass over every case
  getSnapValues: () => readonly number[]
}

export interface IRangeKeyModifiers {
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}

export type RangeKeyChange =
  | { kind: "move", low: number }
  | { kind: "resize", low: number, high: number }

// the direction an arrow or page key moves in, and whether it moves by a page
function keyDirection(key: string, shiftKey: boolean): { sign: 1 | -1, isPage: boolean } | undefined {
  switch (key) {
    case "ArrowRight": case "ArrowUp": return { sign: 1, isPage: shiftKey }
    case "ArrowLeft": case "ArrowDown": return { sign: -1, isPage: shiftKey }
    case "PageUp": return { sign: 1, isPage: true }
    case "PageDown": return { sign: -1, isPage: true }
  }
}

function resizeForKey(context: IRangeKeyContext, key: string, shiftKey: boolean): RangeKeyChange | undefined {
  // Chromebooks send Alt+Up/Down as Page Up/Down, so a resize on them would be unreachable there
  if (key !== "ArrowRight" && key !== "ArrowLeft") return
  const { low, high, max, step, pageSize } = context
  const sign = key === "ArrowRight" ? 1 : -1
  // a point has nothing to narrow
  if (sign < 0 && high === low) return
  const newHigh = Math.min(max, Math.max(low, high + sign * (shiftKey ? pageSize : step)))
  return { kind: "resize", low, high: newHigh }
}

// values: the data's values on the axis, in order
function collapsedMoveForKey(context: IRangeKeyContext, values: readonly number[], key: string, shiftKey: boolean)
    : RangeKeyChange | undefined {
  const { low, pageSize } = context
  if (key === "Home") return { kind: "move", low: values[0] }
  if (key === "End") return { kind: "move", low: values[values.length - 1] }
  const direction = keyDirection(key, shiftKey)
  if (!direction) return
  const { sign, isPage } = direction
  // in the direction of travel, the values beyond the point, nearest first
  const ahead = sign > 0 ? values.filter(value => value > low) : values.filter(value => value < low).reverse()
  if (!ahead.length) return { kind: "move", low }
  if (!isPage) return { kind: "move", low: ahead[0] }
  const target = low + sign * pageSize
  const reached = ahead.find(value => sign > 0 ? value >= target : value <= target)
  return { kind: "move", low: reached ?? ahead[ahead.length - 1] }
}

// The change a key makes to the range, or undefined if the key isn't one the range handles. Moves aren't clamped
// to the axis here; the slider model does that, keeping the width.
export function rangeForKey(context: IRangeKeyContext, key: string, modifiers: IRangeKeyModifiers)
    : RangeKeyChange | undefined {
  const { shiftKey, altKey, ctrlKey, metaKey } = modifiers
  // Ctrl and Meta chords belong to the system, the browser and screen readers
  if (ctrlKey || metaKey) return
  if (altKey) return resizeForKey(context, key, shiftKey)
  const { low, high, min, max, step, pageSize } = context
  if (high === low) {
    // where the axis shows none of the data's values, a point moves by steps, as dragging it moves it freely
    const values = context.getSnapValues().filter(value => value >= min && value <= max)
    if (values.length) return collapsedMoveForKey(context, values, key, shiftKey)
  }
  if (key === "Home") return { kind: "move", low: min }
  if (key === "End") return { kind: "move", low: max - (high - low) }
  const direction = keyDirection(key, shiftKey)
  if (!direction) return
  return { kind: "move", low: low + direction.sign * (direction.isPage ? pageSize : step) }
}

// Whether two ranges are the same but for floating-point error, e.g. after steps right and back left. Steps are
// the axis's resolution, so a difference far below one is no difference the user made.
export function rangesMatch([lowA, highA]: readonly [number, number], [lowB, highB]: readonly [number, number],
                            step: number) {
  const tolerance = Math.abs(step) * 1e-6
  return Math.abs(lowA - lowB) <= tolerance && Math.abs(highA - highB) <= tolerance
}
