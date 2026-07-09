import { kCodapResourcesUrl, kRootDataGamesPluginUrl, kRootGuideUrl, kRootPluginsUrl } from "../../constants"
import { getDataInteractiveUrl } from "../../utilities/url-params"

export const kRelativePluginRoot = "../../../../extn/plugins"
export const kRelativeGuideRoot = "../../../../extn/example-documents/guides"
export const kRelativeURLRoot = "%_url_%/guides"

// Absolute URLs from old documents that should be rewritten to use the same-origin proxy
const kAbsoluteUrlRewrites: Array<[RegExp, string]> = [
  // Old codap-resources.concord.org URLs → /codap-resources/
  [/^https?:\/\/codap-resources\.concord\.org\/(.+)$/, `${kCodapResourcesUrl}/$1`],
  // Old codap3.concord.org/plugins/ URLs → /codap-resources/plugins/
  [/^https?:\/\/codap3\.concord\.org\/plugins\/(.+)$/, `${kCodapResourcesUrl}/plugins/$1`],
  // Documents saved on localhost use codap.concord.org/codap-resources/... which won't work on deployed
  [/^https?:\/\/codap\.concord\.org\/codap-resources\/(.+)$/, `${kCodapResourcesUrl}/$1`],
]

// Old/new plugin URL mappings stored as tuples of [oldUrl, newUrl] so that we can use
// a substring match against the old URL to find the new URL.
const kFullyReplacedUrls: Array<[RegExp, string]> = [
  // v3 version of Markov has been deployed to s3, but not all data games have been migrated
  [/\/concord-consortium.github.io\/codap-data-interactives\/Markov\/?/, `${kRootDataGamesPluginUrl}/Markov/`],
]

const kReplaceToken = "_$@_"
const kPartiallyReplacedUrls: Array<[RegExp, string]> = [
  // NOAA weather plugin was renamed in the S3 bucket
  [/\/plugins\/NOAA-weather\/(.+)$/, `${kRootPluginsUrl}/noaa-codap-plugin/${kReplaceToken}`],
]

/**
 * Rewrite absolute URLs from old documents to use the same-origin proxy path.
 * Used by both processWebViewUrl (V2 import) and preProcessSnapshot (V3 load).
 */
export function rewriteAbsoluteUrl(url: string): string {
  for (const [urlRegex, replacement] of kAbsoluteUrlRewrites) {
    const rewritten = url.replace(urlRegex, replacement)
    if (rewritten !== url) {
      return rewritten
    }
  }
  return url
}

export function processWebViewUrl(url: string) {
  // First, allow any URL modifications from url params
  let updatedUrl = getDataInteractiveUrl(url)

  // Rewrite absolute URLs from old documents to use same-origin proxy path
  updatedUrl = rewriteAbsoluteUrl(updatedUrl)

  // Many plugins were hosted on GitHub pages at http://concord-consortium.github.io/codap-data-interactives/
  // or other sites but are now hosted on s3, so we have to change the URL to point to the new location.
  const fullyReplacedUrlEntry = kFullyReplacedUrls.find(([urlRegex]) => urlRegex.test(updatedUrl))
  if (fullyReplacedUrlEntry) {
    updatedUrl = fullyReplacedUrlEntry[1]
  }

  for (const [urlRegex, newUrl] of kPartiallyReplacedUrls) {
    const execResult = urlRegex.exec(updatedUrl)
    if (execResult && execResult.length > 1) {
      updatedUrl = newUrl.replace(kReplaceToken, execResult[1])
    }
  }

  // Some plugins relied on index.html being the default file loaded when pointing to a directory.
  // This is no longer the case with our S3 hosted plugins, so we have to modify the path to point to the
  // correct file in this case.
  if (updatedUrl.endsWith("/")) updatedUrl = `${updatedUrl}index.html`

  // Many plugins used to be packaged with CODAP v2, then referenced relatively.
  // These references need to be changed to point to the S3 bucket we now use to host plugins.
  if (updatedUrl.startsWith(kRelativePluginRoot)) {
    updatedUrl = `${kRootPluginsUrl}${updatedUrl.slice(kRelativePluginRoot.length)}`
  }

  // Some example document guides were packaged with CODAP v2, then referenced relatively.
  // These references need to be changed to point to the S3 bucket we now use to host guides.
  if (updatedUrl.startsWith(kRelativeGuideRoot)) {
    updatedUrl = `${kRootGuideUrl}${updatedUrl.slice(kRelativeGuideRoot.length)}`
  }

  if (updatedUrl.startsWith(kRelativeURLRoot)) {
    updatedUrl = `${kRootGuideUrl}${updatedUrl.slice(kRelativeURLRoot.length)}`
  }

  // Some plugins were referenced with "http://", but this is no longer secure enough in the world of https.
  const http = "http://"
  if (updatedUrl.startsWith(http)) updatedUrl = `https://${updatedUrl.slice(http.length)}`

  return updatedUrl
}

/**
 * Append or replace a query parameter on a plugin URL.
 * Skips data: URLs and empty strings.
 */
function setUrlQueryParam(url: string, name: string, value: string): string {
  const trimmedUrl = url?.trim()
  if (!trimmedUrl || trimmedUrl.startsWith("data:")) return url
  if (/^https?:\/\//.test(trimmedUrl)) {
    try {
      const parsed = new URL(trimmedUrl)
      parsed.searchParams.set(name, value)
      return parsed.toString()
    } catch {
      // fall through to string manipulation
    }
  }
  // For relative or malformed URLs, parse the query portion with URLSearchParams so
  // we match the absolute-URL semantics: encoding is handled, and `set()` removes
  // any existing duplicate entries before assigning a single value.
  const hashIndex = trimmedUrl.indexOf("#")
  const [base, hash] = hashIndex >= 0
    ? [trimmedUrl.slice(0, hashIndex), trimmedUrl.slice(hashIndex)]
    : [trimmedUrl, ""]
  const queryStart = base.indexOf("?")
  const path = queryStart >= 0 ? base.slice(0, queryStart) : base
  const params = new URLSearchParams(queryStart >= 0 ? base.slice(queryStart + 1) : "")
  params.set(name, value)
  const newQuery = params.toString()
  return newQuery ? `${path}?${newQuery}${hash}` : `${path}${hash}`
}

/**
 * Append or replace the `lang` query parameter on a plugin URL.
 * Skips data: URLs and empty strings.
 */
export function appendLangParam(url: string, lang: string): string {
  return setUrlQueryParam(url, "lang", lang)
}

/**
 * Append or replace the `locale` query parameter on a plugin URL.
 * Skips data: URLs and empty strings.
 */
export function appendLocaleParam(url: string, locale: string): string {
  return setUrlQueryParam(url, "locale", locale)
}

// URL schemes that are safe to load into the WebView <iframe> src. Anything with an explicit
// scheme outside this allowlist is rejected — notably `javascript:` and `vbscript:`, which
// execute in the parent document's origin and enable DOM-based XSS / page takeover.
// `http`/`https` are the normal cases; `data`/`blob` support locally-generated content and load
// in their creator's origin (not CODAP's, for typed or plugin-supplied URLs) so cannot reach the
// parent DOM; `about` covers about:blank.
const kSafeWebViewUrlSchemes = new Set(["http", "https", "data", "blob", "about"])

/**
 * Returns true if the URL is safe to assign to a WebView <iframe> src.
 * Empty and scheme-less (relative) URLs are safe; a URL with an explicit scheme is safe only if
 * that scheme is in the allowlist. The scheme is extracted the way browsers parse it: tab/LF/CR
 * are stripped from anywhere in the URL and leading C0 control characters and spaces are ignored,
 * so obfuscations like " javascript:", "JavaScript:", and "java\tscript:" are all detected.
 */
export function isSafeWebViewUrl(url: string): boolean {
  if (!url) return true
  // Browsers remove all tab/LF/CR characters from anywhere in a URL and ignore leading C0
  // control characters and spaces, so mirror that before extracting the scheme.
  // eslint-disable-next-line no-control-regex
  const sanitized = url.replace(/[\t\n\r]/g, "").replace(/^[\x00-\x20]+/, "")
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(sanitized)
  if (!match) return true // no explicit scheme → relative URL, resolved against our own origin
  return kSafeWebViewUrlSchemes.has(match[1].toLowerCase())
}

export function normalizeUrlScheme(url: string): string {
  url = url.trim()
  if (url.startsWith("//")) {
    // Handle scheme-relative URLs (e.g. //example.com/path)
    return `https:${url}`
  }
  // Only prepend https:// if the URL doesn't already have a scheme (e.g. data:, blob:, http:)
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url)
  if (!hasScheme) {
    return `https://${url}`
  }
  return url
}

export function getNameFromURL(iUrl: string | URL | null | undefined): string {
  if (!iUrl) return ""

  // Skip processing for data URLs - they don't have meaningful names
  const urlString = iUrl instanceof URL ? iUrl.href : iUrl
  if (urlString.startsWith("data:")) {
    return ""
  }

  // Allow either a string or a URL instance
  const url = iUrl instanceof URL
                ? iUrl
                : new URL(iUrl, window.location.origin)

  // Split pathname into parts and filter out empty parts
  const parts = url.pathname.split("/").filter(Boolean)

  if (parts.length === 0) {
    // No path → return first meaningful part of the hostname, skipping "www"
    // Examples: sampler.concord.org → "sampler", www.example.com → "example"
    const hostParts = url.hostname.split(".")
    const firstPart = hostParts[0] ?? ""
    return firstPart === "www" ? (hostParts[1] ?? "") : firstPart
  }

  // Return the last part of the path or empty string (if there are no meaningful path segments)
  const lastPart = parts.pop() ?? ""

  // Strip extension (first dot and everything after)
  return lastPart.split(".")[0]
}
