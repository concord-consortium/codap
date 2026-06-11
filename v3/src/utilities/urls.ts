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

/**
 * Replacement for URL.canParse(), which isn't available in older browsers (e.g. Chrome < 120,
 * the last version supported on macOS Mojave). Returns true if the string can be parsed as an
 * absolute URL. Like URL.canParse() with no base, relative paths return false.
 */
export function canParseUrl(url: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(url)
    return true
  } catch {
    return false
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
