/**
 * Parse a URL string, resolving relative paths against the current page origin.
 * Returns undefined if the URL is invalid.
 */
export function safeParseUrl(url: string): URL | undefined {
  if (!url) return undefined
  try {
    const base = typeof window !== "undefined" ? window.location.origin : undefined
    return new URL(url, base)
  } catch {
    return undefined
  }
}

export function getExtensionFromUrl(url: string): string | undefined {
  const pathParts = safeParseUrl(url)?.pathname.toLowerCase().split(".") ?? []
  return pathParts.length > 1 ? pathParts[pathParts.length - 1] : undefined
}

// Regex to detect Google Sheets URLs
const kGoogleSheetsUrlPattern = /docs\.google\.com\/spreadsheets/i

/**
 * Check if a URL points to a Google Sheets document
 */
export function isGoogleSheetsUrl(url: string): boolean {
  return kGoogleSheetsUrlPattern.test(url)
}
