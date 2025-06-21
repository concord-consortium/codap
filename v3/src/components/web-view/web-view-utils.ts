import { kRootDataGamesPluginUrl, kRootGuideUrl, kRootPluginUrl } from "../../constants"

export const kRelativePluginRoot = "../../../../extn/plugins"
export const kRelativeGuideRoot = "../../../../extn/example-documents/guides"
export const kRelativeURLRoot = "%_url_%/guides"

// Old/new plugin URL mappings stored as tuples of [oldUrl, newUrl] so that we can use
// a substring match against the old URL to find the new URL.
const kMappedUrls: Array<[string, string]> = [
  // v3 version of Markov has been deployed to s3, but not all data games have been migrated
  ["//concord-consortium.github.io/codap-data-interactives/Markov", `${kRootDataGamesPluginUrl}/Markov/`]
]

export function processWebViewUrl(url: string) {
  let updatedUrl = url

  // Many plugins were hosted on GitHub pages at http://concord-consortium.github.io/codap-data-interactives/
  // or other sites but are now hosted on s3, so we have to change the URL to point to the new location.
  const mappedUrl = kMappedUrls.find(([oldUrl]) => updatedUrl.includes(oldUrl))
  if (mappedUrl) {
    updatedUrl = mappedUrl[1]
  }

  // Some plugins relied on index.html being the default file loaded when pointing to a directory.
  // This is no longer the case with our S3 hosted plugins, so we have to modify the path to point to the
  // correct file in this case.
  if (updatedUrl.endsWith("/")) updatedUrl = `${updatedUrl}index.html`

  // Many plugins used to be packaged with CODAP v2, then referenced relatively.
  // These references need to be changed to point to the S3 bucket we now use to host plugins.
  if (updatedUrl.startsWith(kRelativePluginRoot)) {
    updatedUrl = `${kRootPluginUrl}${updatedUrl.slice(kRelativePluginRoot.length)}`
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
