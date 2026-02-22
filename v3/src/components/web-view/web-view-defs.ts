export const kWebViewTileType = "CodapWebView"
export const kV2GameType = "game"
export const kV2GuideViewType = "guideView"
export const kV2ImageComponentViewType = "imageComponentView"
export const kV2WebViewType = "webView"
export const kWebViewTileClass = "codap-web-view"
export const kWebViewBodyClass = "codap-web-view-body"

export const webViewSubTypes = ["guide", "plugin", "image"] as const
export type WebViewSubType = typeof webViewSubTypes[number]

export const kImporterPluginWidth = 300
export const kImporterPluginHeight = 320
export const kImporterPluginInsertOptions = {
  x: 5, y: 5, width: kImporterPluginWidth, height: kImporterPluginHeight, isHidden: true
}

// Plugins known to be localized that require iframe reload on locale change.
// Plugins can opt out by setting handlesLocaleChange: true via interactiveFrame.update.
// TODO: There is server-side URL mapping (e.g. in processWebViewUrl) that may rewrite plugin
// URLs before they reach the model. We may need to expand this list to accommodate alternate
// URLs that map to the same plugins.
export const kLocalizedPluginPatterns = [
  "/Importer/",
  "/TP-Sampler/",
  "/Scrambler/",
  "/storyBuilder/"
]
