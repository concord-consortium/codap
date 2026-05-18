/**
 * Banner configuration schema (from remote JSON).
 */
export interface BannerConfig {
  message: string
  id: string
  buttonText?: string
  buttonUrl?: string
  buttonTarget?: string
  enabled?: boolean
  startDate?: number
  endDate?: number
}

/**
 * Check if banner was previously dismissed via localStorage.
 */
export function isBannerDismissed(id: string): boolean {
  try {
    return localStorage.getItem(`announcement-banner-dismissed-${id}`) === "true"
  } catch {
    return false
  }
}

/**
 * Persist banner dismissal to localStorage.
 */
export function dismissBanner(id: string): void {
  try {
    localStorage.setItem(`announcement-banner-dismissed-${id}`, "true")
  } catch {
    // localStorage unavailable - dismissal won't persist
  }
}

/**
 * Validate that buttonUrl uses https:// protocol.
 */
export function isValidButtonUrl(url: string | undefined): boolean {
  if (!url) return false
  return url.startsWith("https://")
}

/**
 * A segment of a parsed banner message: plain text or a link.
 */
export type MessageSegment = { text: string; url?: string }

/**
 * Parse markdown-style [text](url) links in a message string.
 * Returns an array of text and link segments.
 * Only https:// URLs are allowed; invalid URLs are rendered as plain text.
 * Empty link text is treated as plain text.
 */
export function parseMessageWithLinks(message: string): MessageSegment[] {
  const linkRegex = /\[([^\]]+)\]\((https:\/\/[^)]+)\)/g
  const segments: MessageSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: message.slice(lastIndex, match.index) })
    }
    segments.push({ text: match[1], url: match[2] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < message.length || segments.length === 0) {
    segments.push({ text: message.slice(lastIndex) })
  }

  return segments
}

/**
 * Check if current time is within the banner's date range.
 */
export function isWithinDateRange(config: BannerConfig): boolean {
  const now = Date.now()
  const { startDate, endDate } = config

  if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
    return false
  }

  if (startDate !== undefined && now < startDate) {
    return false
  }

  if (endDate !== undefined && now > endDate) {
    return false
  }

  return true
}

const isOptionalString = (v: unknown) => v === undefined || typeof v === "string"
const isOptionalBoolean = (v: unknown) => v === undefined || typeof v === "boolean"
const isOptionalFiniteNumber = (v: unknown) =>
  v === undefined || (typeof v === "number" && Number.isFinite(v))

/**
 * Validate banner JSON has required fields, and that any optional fields
 * present have the expected runtime types.
 *
 * Strict validation matters here because optional fields like `enabled`,
 * `startDate`, and `endDate` directly control whether the banner renders.
 * Without this, a typo like `enabled: "false"` (string) would silently fail
 * open and render the banner anyway. Any fields not listed in BannerConfig
 * are silently ignored.
 */
export function isValidBannerConfig(data: unknown): data is BannerConfig {
  if (typeof data !== "object" || data === null) return false
  const obj = data as Record<string, unknown>
  return typeof obj.message === "string" &&
         obj.message.length > 0 &&
         typeof obj.id === "string" &&
         obj.id.length > 0 &&
         isOptionalString(obj.buttonText) &&
         isOptionalString(obj.buttonUrl) &&
         isOptionalString(obj.buttonTarget) &&
         isOptionalBoolean(obj.enabled) &&
         isOptionalFiniteNumber(obj.startDate) &&
         isOptionalFiniteNumber(obj.endDate)
}

/**
 * Validate a banner config and check whether it should be shown.
 * Returns the config if valid and active, null otherwise.
 * Checks: schema validation, enabled flag, date range, and dismissal.
 */
export function validateBannerConfig(data: unknown): BannerConfig | null {
  if (!isValidBannerConfig(data)) {
    return null
  }

  if (data.enabled === false) {
    return null
  }

  if (!isWithinDateRange(data)) {
    return null
  }

  if (isBannerDismissed(data.id)) {
    return null
  }

  return data
}

/**
 * Fetch and validate banner configuration.
 * Returns null if fetch fails, JSON is invalid, or banner should not be shown.
 */
export async function fetchBannerConfig(url: string): Promise<BannerConfig | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return validateBannerConfig(data)
  } catch {
    // Fetch error, JSON parse error, etc. - silent failure
    return null
  }
}
