import { ITileContentModel } from "../../models/tiles/tile-content"
import {
  kV2GameType, kV2GuideViewType, kV2ImageComponentViewType, kV2WebViewType, WebViewSubType
} from "./web-view-defs"
import { isWebViewModel } from "./web-view-model"

// V3 collapses V2's GameView / GuideView / ImageComponentView / WebView into a single
// CodapWebView tile type, then routes the V2 type per content.subType. Shared by the
// WebView DI handler's `get` path and by `getV2Type` so notifications and API responses
// agree on the V2 type for the same content (CODAP-1353).
export const kSubTypeToV2TypeMap: Record<WebViewSubType, string> = {
  guide: kV2GuideViewType,
  image: kV2ImageComponentViewType,
  plugin: kV2GameType
}

export function webViewV2Type(content: ITileContentModel) {
  if (!isWebViewModel(content)) return kV2WebViewType
  return (content.subType && kSubTypeToV2TypeMap[content.subType]) ?? kV2WebViewType
}
