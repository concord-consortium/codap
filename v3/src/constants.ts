import { urlParams } from "./utilities/url-params"

export const kCodapResourcesUrl = "https://codap-resources.concord.org"

export const codapResourcesUrl = (relUrl: string) => `${kCodapResourcesUrl}/${relUrl}`

export const kRootPluginUrl = codapResourcesUrl("plugins")

export function getPluginsRootUrl() {
  return urlParams.pluginURL || kRootPluginUrl
}
