import { SlateExchangeValue } from "@concord-consortium/slate-editor"
import { kCalculatorTileType, kV2CalculatorDIType } from "../components/calculator/calculator-defs"
import { kCaseCardTileType, kV2CaseCardType } from "../components/case-card/case-card-defs"
import { kCaseTableTileType, kV2CaseTableType } from "../components/case-table/case-table-defs"
import { kGraphTileType, kV2GraphType } from "../components/graph/graph-defs"
import { kMapTileType, kV2MapType } from "../components/map/map-defs"
import { kSliderTileType, kV2SliderType } from "../components/slider/slider-defs"
import { kTextTileType, kV2TextDIType } from "../components/text/text-defs"
import {
  kV2GameType, kV2GuideViewType, kV2ImageComponentViewType, kV2WebViewType, kWebViewTileType
} from "../components/web-view/web-view-defs"

// export const kV2ImageType = "image"
// export const kV2TextType = "text"

export const kComponentTypeV3ToV2Map: Record<string, string> = {
  [kCalculatorTileType]: kV2CalculatorDIType,
  [kCaseTableTileType]: kV2CaseTableType,
  [kCaseCardTileType]: kV2CaseCardType,
  [kGraphTileType]: kV2GraphType,
  [kMapTileType]: kV2MapType,
  [kSliderTileType]: kV2SliderType,
  [kTextTileType]: kV2TextDIType,
  [kWebViewTileType]: kV2WebViewType
}

// For V2-plugin compatibility. V2 uses two `type` conventions in component-resource
// notification payloads depending on the operation kind:
//   - OPERATIONAL ops (titleChange, calculate, edit formula, attributeChange, change
//     column width, resize column, etc.) — emitted via inline `executeNotification`
//     blocks — carry the SC class name (e.g. `"DG.Calculator"`,
//     apps/dg/components/calculator/calculator.js:99 emits `type: 'DG.Calculator'`).
//   - LIFECYCLE ops (create, delete, hide, show) — emitted via the
//     `DG.UndoHistory.makeComponentNotification(op, type)` helper — carry the lowercase
//     DI-convention name in MOST cases, but V2 sometimes uses a *different* lowercase
//     name than what its DI-API responses use (see kV2DITypeToLifecycleNameMap).
// V2's `get component/<id>` API responses use the lowercase DI name. Arguably V2's
// notification path should have used the same translation table the API path does, but
// that's water under the bridge — V2 plugins in the wild filter on whichever string V2
// actually sent. V3's `tileNotification` mirrors V2's per-op convention so V2 plugins
// match, and always adds the DI name as the additive `values.diType` so V3-aware plugins
// don't have to know V2's two conventions.
//
// `kV2DITypeToSCNameMap` is keyed by DI type rather than V3 tile type. V3 sometimes
// resolves the DI type at runtime via `getTileContentInfo(type)?.getV2Type?.(content)`
// (e.g. WebView returns `'game'` when `isPlugin`), so the SC mapping needs to follow the
// runtime-resolved DI type, not the static V3 tile type. This map covers all DI types
// V3 may emit, including the WebView subtypes (game / guideView / imageComponent).
export const kV2DITypeToSCNameMap: Record<string, string> = {
  calculator: "DG.Calculator",
  caseTable: "DG.CaseTable",
  caseCard: "DG.CaseCard",
  graph: "DG.GraphView",
  map: "DG.MapView",
  slider: "DG.SliderView",
  text: "DG.TextView",
  webView: "DG.WebView",
  game: "DG.GameView",
  guideView: "DG.GuideView",
  imageComponent: "DG.ImageComponentView"
}

// V2's lifecycle `type` strings sometimes differ from its DI-API names. Verified V2
// sources: app_controller.js:122 (`'table'` for case-table create/delete) and
// document_controller.js:587, 1649 (`'calcView'` for calculator hide/show). Everything
// else lines up with the DI name — graph, map, slider, text, webView, etc.
//
// Keys are V2 DI types; values are V2's lifecycle-notification `type` strings. Anything
// not listed uses its DI name verbatim for lifecycle ops.
export const kV2DITypeToLifecycleNameMap: Record<string, string> = {
  caseTable: "table",
  calculator: "calcView"
}

export const kComponentTypeV2ToV3Map: Record<string, string> = {
  [kV2GameType]: kWebViewTileType,
  [kV2GuideViewType]: kWebViewTileType,
  [kV2ImageComponentViewType]: kWebViewTileType
}
for (const key in kComponentTypeV3ToV2Map) {
  kComponentTypeV2ToV3Map[kComponentTypeV3ToV2Map[key]] = key
}

export interface V2Component {
  cannotClose?: boolean
  dimensions?: {
    width: number
    height: number
  }
  id?: number
  isResizable?: boolean | { width: boolean, height: boolean }
  isVisible?: boolean
  name?: string
  position?: string | {
    left: number
    top: number
  }
  title?: string
  type: string
}
export interface V2Calculator extends V2Component {
  type: "calculator"
}
export interface V2CaseCard extends V2Component {
  dataContext?: string
  type: "caseCard"
}
export interface V2CaseTable extends V2Component {
  dataContext?: string
  horizontalScrollOffset?: number
  isIndexHidden?: boolean
  type: "caseTable"
}
export function isV2CaseTableComponent(obj?: any): obj is V2CaseTable {
  return obj && typeof obj === "object" && "type" in obj && obj.type === "caseTable"
}
export interface V2Game extends V2Component {
  type: "game"
  URL?: string
  // V2 aliases for URL and name
  currentGameUrl?: string
  currentGameName?: string
}
export interface V2Graph extends V2Component {
  backgroundColor?: string
  barChartFormula?: string
  barChartScale?: string
  captionAttributeID?: number | null
  captionAttributeName?: string | null
  dataContext?: string
  displayOnlySelectedCases?: boolean
  enableNumberToggle?: boolean
  filterFormula?: string
  hiddenCases?: number[]
  legendAttributeID?: number | null
  legendAttributeName?: string | null
  numberToggleLastMode?: boolean
  plotType?: string
  pointColor?: string
  pointSize?: number
  pointsAreFusedIntoBars?: boolean
  primaryAxis?: string
  rightNumericAttributeID?: number | null
  rightNumericAttributeName?: string | null
  rightSplitAttributeID?: number | null
  rightSplitAttributeName?: string | null
  showConnectingLines?: boolean
  showMeasuresForSelection?: boolean
  strokeColor?: string
  strokeSameAsFill?: boolean
  topSplitAttributeID?: number | null
  topSplitAttributeName?: string | null
  transparent?: boolean
  type: "graph"
  xAttributeID?: number | null
  xAttributeName?: string | null
  xAttributeType?: string
  xLowerBound?: number
  xUpperBound?: number
  yAttributeID?: number | null
  yAttributeIDs?: number[]
  yAttributeName?: string | null
  yAttributeNames?: string[]
  yAttributeType?: string
  yLowerBound?: number
  yUpperBound?: number
  y2AttributeID?: number | null
  y2AttributeName?: string | null
  y2AttributeType?: string
  y2LowerBound?: number
  y2UpperBound?: number
}
export interface V2GetGraph extends V2Graph {
  xLowerBound?: number
  xUpperBound?: number
  yLowerBound?: number
  yUpperBound?: number
  y2LowerBound?: number
  y2UpperBound?: number
}
export interface V2GuidePage {
  itemTitle: string
  url: string
}
export interface V2Guide extends V2Component {
  currentItemIndex?: number
  isVisible?: boolean
  items?: V2GuidePage[]
  type: "guideView"
}

export interface V2MapGeoRaster {
  type: string
  url: string
  opacity?: number
}
export interface V2Map extends V2Component {
  center?: [number, number]
  dataContext?: string
  legendAttributeName?: string
  type: "map"
  zoom?: number
  geoRaster?: V2MapGeoRaster
}

// This really isn't the v2 form of the Slider component, that is
// defined by ICodapV2SliderStorage. This the format of data that
// can be sent and received via API.
export interface V2Slider extends V2Component {
  type: "slider"
  animationDirection?: number
  animationMode?: number
  animationRate?: number
  globalValueName?: string
  multipleOf?: number
  dateMultipleOfUnit?: string
  scaleType?: string
  upperBound?: number
  lowerBound?: number
  value?: number
}
export interface V2Text extends V2Component {
  text?: string | SlateExchangeValue
  type: "text"
}
export interface V2WebView extends V2Component {
  type: "webView"
  URL?: string
}

export type V2SpecificComponent = V2Calculator | V2CaseCard | V2CaseTable | V2Game | V2Graph | V2Guide | V2Map |
  V2Slider | V2Text | V2WebView
