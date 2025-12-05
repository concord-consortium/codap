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
export const kImporterPluginHeight = 275
export const kImporterPluginInsertOptions = {
  x: 5, y: 5, width: kImporterPluginWidth, height: kImporterPluginHeight, isHidden: true
}
