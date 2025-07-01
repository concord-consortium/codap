import { urlParams } from "./utilities/url-params"

export const kCodapResourcesUrl = "https://codap-resources.concord.org"
export const kCodap3RootUrl = "https://codap3.concord.org"

export const codapResourcesUrl = (relUrl: string) => `${kCodapResourcesUrl}/${relUrl}`

export const kRootPluginsUrl = codapResourcesUrl("plugins")
// for plugins that are proxied from codap3.concord.org
export const kCodap3RootPluginsUrl = `${kCodap3RootUrl}/plugins`
export const kRootDataGamesPluginUrl = codapResourcesUrl("plugins/data-games")
export const kRootGuideUrl = codapResourcesUrl("example-documents/guides")

export function getPluginsRootUrl() {
  return urlParams.pluginURL || kRootPluginsUrl
}

export const kImporterPluginUrl = "/Importer/index.html?lang=en-US"
export function getImporterPluginUrl() {
  return `${getPluginsRootUrl()}${kImporterPluginUrl}`
}
