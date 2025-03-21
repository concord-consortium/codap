import { kRootGuideUrl, kRootPluginUrl } from "../../constants"

export const kRelativePluginRoot = "../../../../extn/plugins"
export const kRelativeGuideRoot = "%_url_%/guides"

export function processPluginUrl(url: string) {
  let updatedUrl = url

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

  // Some plugins were referenced with "http://", but this is no longer secure enough in the world of https.
  const http = "http://"
  if (updatedUrl.startsWith(http)) updatedUrl = `https://${updatedUrl.slice(http.length)}`

  return updatedUrl
}
