// Re-export the existing type for convenience
export type { GraphCellKey } from "../graphing-types"

// Special marker when same attribute appears on multiple axes with conflicting values
export const kImpossible = "__IMPOSSIBLE__"

/**
 * Convert a cell key to a stable string for use as a cache key.
 * Unlike JSON.stringify, this produces the same string regardless of property insertion order.
 */
export function cellKeyToString(cellKey: Record<string, string>): string {
  const entries = Object.entries(cellKey)
  if (entries.length === 0) return ""
  // Sort by key for deterministic output
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  return entries.map(([k, v]) => `${k}:${v}`).join("|")
}
