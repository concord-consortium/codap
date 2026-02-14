import { kCodap3RootPluginsUrl, kRootDataGamesPluginUrl, kRootGuideUrl, kRootPluginsUrl } from "../../constants"
import { getDataInteractiveUrl } from "../../utilities/url-params"

export const kRelativePluginRoot = "../../../../extn/plugins"
export const kRelativeGuideRoot = "../../../../extn/example-documents/guides"
export const kRelativeURLRoot = "%_url_%/guides"

// Old/new plugin URL mappings stored as tuples of [oldUrl, newUrl] so that we can use
// a substring match against the old URL to find the new URL.
const kFullyReplacedUrls: Array<[RegExp, string]> = [
  // v3 version of Markov has been deployed to s3, but not all data games have been migrated
  [/\/concord-consortium.github.io\/codap-data-interactives\/Markov\/?/, `${kRootDataGamesPluginUrl}/Markov/`],
  // onboarding plugins are proxied so that drag/drop works, so we used the proxied url
  [/\/plugins\/onboarding\/?$/, `${kCodap3RootPluginsUrl}/onboarding/`],
]

const kReplaceToken = "_$@_"
const kPartiallyReplacedUrls: Array<[RegExp, string]> = [
  // [V2] weather plugin url was mapped in V2 code
  [/\/plugins\/NOAA-weather\/(.+)$/, `${kCodap3RootPluginsUrl}/noaa-codap-plugin/${kReplaceToken}`],
  // onboarding plugins are proxied so that drag/drop works, so we used the proxied url
  [/\/plugins\/onboarding\/(.+)$/, `${kCodap3RootPluginsUrl}/onboarding/${kReplaceToken}`]
]

export function processWebViewUrl(url: string) {
  // First, allow any URL modifications from url params
  let updatedUrl = getDataInteractiveUrl(url)

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
 * Append or replace the `lang` query parameter on a plugin URL.
 * Skips data: URLs and empty strings.
 */
export function appendLangParam(url: string, lang: string): string {
  if (!url || url.startsWith("data:")) return url
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("lang", lang)
    return parsed.toString()
  } catch {
    // For relative or malformed URLs, fall back to simple string manipulation
    const langParam = `lang=${lang}`
    // Replace existing lang param if present
    const replaced = url.replace(/([?&])lang=[^&]*/, `$1${langParam}`)
    if (replaced !== url) return replaced
    // Split off hash fragment before appending
    const hashIndex = url.indexOf("#")
    const [base, hash] = hashIndex >= 0 ? [url.slice(0, hashIndex), url.slice(hashIndex)] : [url, ""]
    return base + (base.includes("?") ? "&" : "?") + langParam + hash
  }
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
    // No path → return first part of the hostname
    // Example: sampler.concord.org → ["sampler", "concord", "org"]
    const hostParts = url.hostname.split(".")
    return hostParts[0] ?? ""
  }

  // Return the last part of the path or empty string (if there are no meaningful path segments)
  const lastPart = parts.pop() ?? ""

  // Strip extension (first dot and everything after)
  return lastPart.split(".")[0]
}
