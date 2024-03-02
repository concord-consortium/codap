import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { kWebViewTileType } from "./web-view-defs"
import { WebViewModel } from "./web-view-model"
import { WebViewComponent } from "./web-view"
import { WebViewInspector } from "./web-view-inspector"
import { WebViewTitleBar } from "./web-view-title-bar"

export const kWebViewIdPrefix = "WEBV"

registerTileContentInfo({
  type: kWebViewTileType,
  prefix: kWebViewIdPrefix,
  modelClass: WebViewModel,
  defaultContent: () => ({ type: kWebViewTileType })
})

registerTileComponentInfo({
  type: "CodapWebView",
  TitleBar: WebViewTitleBar,
  Component: WebViewComponent,
  InspectorPanel: WebViewInspector,
  tileEltClass: "codap-web-view",
  defaultWidth: 600,
  defaultHeight: 400
})
