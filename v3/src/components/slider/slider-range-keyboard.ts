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
  // the bound attribute's sorted distinct values, which a collapsed range moves through
  snapValues: readonly number[]
}

export interface IRangeKeyModifiers {
  shiftKey: boolean
  altKey: boolean
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
  // Alt+Up/Down are left alone: Chromebooks send them as Page Up/Down
  if (key !== "ArrowRight" && key !== "ArrowLeft") return
  const { low, high, max, step, pageSize } = context
  const sign = key === "ArrowRight" ? 1 : -1
  // a point has nothing to narrow
  if (sign < 0 && high === low) return
  const newHigh = Math.min(max, Math.max(low, high + sign * (shiftKey ? pageSize : step)))
  return { kind: "resize", low, high: newHigh }
}

function collapsedMoveForKey(context: IRangeKeyContext, key: string, shiftKey: boolean): RangeKeyChange | undefined {
  const { low, min, max, pageSize } = context
  const values = context.snapValues.filter(value => value >= min && value <= max)
  if (!values.length) return
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
export function rangeForKey(context: IRangeKeyContext, key: string, { shiftKey, altKey }: IRangeKeyModifiers)
    : RangeKeyChange | undefined {
  if (altKey) return resizeForKey(context, key, shiftKey)
  const { low, high, min, max, step, pageSize } = context
  if (high === low) return collapsedMoveForKey(context, key, shiftKey)
  if (key === "Home") return { kind: "move", low: min }
  if (key === "End") return { kind: "move", low: max - (high - low) }
  const direction = keyDirection(key, shiftKey)
  if (!direction) return
  return { kind: "move", low: low + direction.sign * (direction.isPage ? pageSize : step) }
}
