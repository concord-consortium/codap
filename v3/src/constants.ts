import { urlParams } from "./utilities/url-params"

function isLocalDev() {
  return typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
}

// Exported as a function so tests can mock it via jest.mock() to exercise both
// the deployed ("/codap-resources") and localhost ("https://codap.concord.org/codap-resources") code paths.
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
