export const kWebViewTileType = "CodapWebView"
export const kV2GameType = "game"
export const kV2GuideViewType = "guideView"
export const kV2ImageComponentViewType = "imageComponentView"
export const kV2WebViewType = "webView"
export const kWebViewTileClass = "codap-web-view"
export const kWebViewBodyClass = "codap-web-view-body"

export const webViewSubTypes = ["guide", "plugin", "image"] as const
export type WebViewSubType = typeof webViewSubTypes[number]
