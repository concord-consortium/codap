// Re-export the existing type for convenience
export type { GraphCellKey } from "../graphing-types"

// Special marker when same attribute appears on multiple axes with conflicting values
export const kImpossible = "__IMPOSSIBLE__"

/**
 * Escape special characters in keys or values.
 * Replaces `:` with `\:` and `|` with `\|`.
 */
function escapeSpecialCharacters(input: string): string {
  return input.replace(/[:|\\]/g, (match) => `\\${match}`)
}

/**
 * Convert a cell key to a stable string for use as a cache key or instance key.
 * Unlike JSON.stringify, this produces the same string regardless of property insertion order.
 */
export function cellKeyToString(cellKey: Record<string, string>): string {
  const entries = Object.entries(cellKey)
  if (entries.length === 0) return ""
  // Sort by key for deterministic output
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  return entries
    .map(([k, v]) => `${escapeSpecialCharacters(k)}:${escapeSpecialCharacters(v)}`)
    .join("|")
}

/**
 * Unescape special characters in keys or values.
 * Replaces `\:` with `:`, `\|` with `|`, and `\\` with `\`.
 */
function unescapeSpecialCharacters(input: string): string {
  return input.replace(/\\([:|\\])/g, "$1")
}

/**
 * Parse a cell key string back to a Record<string, string>.
 * This is the inverse of cellKeyToString.
 * For legacy JSON format keys (starting with '{'), uses JSON.parse.
 */
export function stringToCellKey(keyString: string): Record<string, string> {
  if (keyString === "") return {}

  // Handle legacy JSON format for backwards compatibility
  if (isLegacyInstanceKey(keyString)) {
    try {
      return JSON.parse(keyString) as Record<string, string>
    } catch {
      return {}
    }
  }

  // Parse new format: key1:value1|key2:value2
  // Need to handle escaped characters: \: \| \\
  const result: Record<string, string> = {}

  // Split by unescaped | (not preceded by \)
  // Use a regex that matches | not preceded by odd number of backslashes
  const pairs = splitByUnescapedDelimiter(keyString, "|")

  for (const pair of pairs) {
    // Split by unescaped : (not preceded by \)
    const parts = splitByUnescapedDelimiter(pair, ":")
    if (parts.length === 2) {
      const key = unescapeSpecialCharacters(parts[0])
      const value = unescapeSpecialCharacters(parts[1])
      result[key] = value
    }
  }

  return result
}

/**
 * Split a string by a delimiter that is not escaped (not preceded by backslash).
 * Handles escaped backslashes correctly.
 */
function splitByUnescapedDelimiter(str: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ""
  let i = 0

  while (i < str.length) {
    if (str[i] === "\\") {
      // Escaped character - include both backslash and next char
      current += str[i]
      i++
      if (i < str.length) {
        current += str[i]
        i++
      }
    } else if (str[i] === delimiter) {
      result.push(current)
      current = ""
      i++
    } else {
      current += str[i]
      i++
    }
  }

  result.push(current)
  return result
}

/**
 * Check if a string is a legacy instance key (JSON.stringify format).
 * Legacy keys start with '{' since they were produced by JSON.stringify.
 * New keys use the 'key:value|key:value' format or are empty string.
 */
export function isLegacyInstanceKey(key: string): boolean {
  return key.startsWith("{")
}

/**
 * Convert a legacy instance key (JSON.stringify format) to the new format.
 * If the key is not a valid legacy key, returns the original key unchanged.
 */
export function migrateLegacyInstanceKey(key: string): string {
  if (!isLegacyInstanceKey(key)) return key
  try {
    const cellKey = JSON.parse(key) as Record<string, string>
    return cellKeyToString(cellKey)
  } catch {
    // If parsing fails, return the original key
    return key
  }
}

/**
 * Migrate all keys in a map snapshot from legacy JSON format to the new format.
 * Returns a new object with migrated keys, or undefined if no migration was needed.
 */
export function migrateInstanceKeyMap<T>(
  mapSnapshot: Record<string, T> | undefined
): Record<string, T> | undefined {
  if (!mapSnapshot) return undefined

  const entries = Object.entries(mapSnapshot)
  const needsMigration = entries.some(([key]) => isLegacyInstanceKey(key))

  if (!needsMigration) return undefined

  const migrated: Record<string, T> = {}
  for (const [key, value] of entries) {
    migrated[migrateLegacyInstanceKey(key)] = value
  }
  return migrated
}
