// A label names a control. Without a cap, a click on a container would send its whole subtree's text.
export const kMaxLabelLength = 100

/** Resolve a click/dblclick target's label per the spec's 4-step fallback, truncated to kMaxLabelLength:
 * 1) aria-label (if non-empty)
 * 2) aria-labelledby target textContent (if non-empty) — per ARIA, this is a
 *    space-separated list of ids whose textContents are concatenated with a
 *    single space.
 * 3) target's own textContent.trim() if 2+ chars AND contains at least one alphanumeric
 * 4) otherwise undefined (omitted)
 */
export function resolveLabel(el: Element | null): string | undefined {
  const label = resolveFullLabel(el)
  return label != null && label.length > kMaxLabelLength
    ? `${label.slice(0, kMaxLabelLength - 1)}…`
    : label
}

function resolveFullLabel(el: Element | null): string | undefined {
  if (!el) return undefined
  const ariaLabel = el.getAttribute?.("aria-label")
  if (ariaLabel && ariaLabel.length > 0) return ariaLabel
  const labelledBy = el.getAttribute?.("aria-labelledby")
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/).filter(id => id.length > 0)
    const parts: string[] = []
    for (const id of ids) {
      const text = document.getElementById?.(id)?.textContent?.trim()
      if (text && text.length > 0) parts.push(text)
    }
    const combined = parts.join(" ")
    if (combined.length > 0) return combined
  }
  const own = el.textContent?.trim() ?? ""
  if (own.length >= 2 && /[\p{L}\p{N}]/u.test(own)) return own
  return undefined
}
