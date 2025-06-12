import { urlParams } from "./utilities/url-params"

export const kCodapResourcesUrl = "https://codap-resources.concord.org"

export const codapResourcesUrl = (relUrl: string) => `${kCodapResourcesUrl}/${relUrl}`

export const kRootPluginUrl = codapResourcesUrl("plugins")
export const kRootGuideUrl = codapResourcesUrl("example-documents/guides")

export function getPluginsRootUrl() {
  return urlParams.pluginURL || kRootPluginUrl
}

export const kImporterPluginUrl = "/Importer/index.html?lang=en-US"
export function getImporterPluginUrl() {
  return `${getPluginsRootUrl()}${kImporterPluginUrl}`
}

export const kDefaultPrecision = 2
