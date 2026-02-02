export function getExtensionFromUrl(url: string): string | undefined {
  try {
    const pathParts = new URL(url).pathname.toLowerCase().split(".")
    return pathParts.length > 1 ? pathParts[pathParts.length - 1] : undefined
  } catch (error) {
    return undefined
  }
}

// Regex to detect Google Sheets URLs
const kGoogleSheetsUrlPattern = /docs\.google\.com\/spreadsheets/i

/**
 * Check if a URL points to a Google Sheets document
 */
export function isGoogleSheetsUrl(url: string): boolean {
  return kGoogleSheetsUrlPattern.test(url)
}
