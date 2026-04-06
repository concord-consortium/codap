import { urlParams } from "./utilities/url-params"

function isLocalDev() {
  if (typeof window === "undefined") return false
  const hostname = window.location.hostname
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0"
}

// Exported as a function for clarity. Note: kCodapResourcesUrl and derived constants are cached at module
// load time. Tests that need to override the base URL must mock all derived constants (see *-deployed.test.ts).
export function getCodapResourcesUrl() {
  // Use codap.concord.org (not codap3) so URLs continue to work when codap3 migrates to codap.concord.org
  return isLocalDev()
    ? "https://codap.concord.org/codap-resources"
    : "/codap-resources"
}

export const kCodapResourcesUrl = getCodapResourcesUrl()

export const codapResourcesUrl = (relUrl: string) => `${kCodapResourcesUrl}/${relUrl}`

export const kRootPluginsUrl = codapResourcesUrl("plugins")
export const kRootDataGamesPluginUrl = codapResourcesUrl("plugins/data-games")
export const kRootGuideUrl = codapResourcesUrl("example-documents/guides")

export function getPluginsRootUrl() {
  return urlParams.pluginURL || kRootPluginsUrl
}

export const kImporterPluginUrl = "/Importer/index.html?lang=en-US"
export function getImporterPluginUrl() {
  return `${getPluginsRootUrl()}${kImporterPluginUrl}`
}

export const kDrawToolPluginUrl = "/DrawTool/index.html?lang=en-US"
export function getDrawToolPluginUrl() {
  return `${getPluginsRootUrl()}${kDrawToolPluginUrl}`
}
