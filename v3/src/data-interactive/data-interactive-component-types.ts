import { kCalculatorTileType } from "../components/calculator/calculator-defs"
import { kCaseTableTileType } from "../components/case-table/case-table-defs"
import { kGraphTileType } from "../components/graph/graph-defs"
import { kMapTileType } from "../components/map/map-defs"
import { kSliderTileType } from "../components/slider/slider-defs"
import { kWebViewTileType } from "../components/web-view/web-view-defs"

export const kV2CalculatorType = "calculator"
export const kV2CaseTableType = "caseTable"
export const kV2CaseCardType = "caseCard"
export const kV2GameType = "game"
export const kV2GraphType = "graph"
export const kV2GuideViewType = "guideView"
export const kV2ImageType = "image"
export const kV2MapType = "map"
export const kV2SliderType = "slider"
export const kV2TextType = "text"
export const kV2WebViewType = "webView"

export const kComponentTypeV3ToV2Map: Record<string, string> = {
  [kCalculatorTileType]: kV2CalculatorType,
  [kCaseTableTileType]: kV2CaseTableType,
  // kV2CaseCardType
  [kGraphTileType]: kV2GraphType,
  // kV2GuideViewType
  // kV2ImageType
  [kMapTileType]: kV2MapType,
  [kSliderTileType]: kV2SliderType,
  // kV2TextType
  [kWebViewTileType]: kV2WebViewType
}

export const kComponentTypeV2ToV3Map: Record<string, string> = {}
for (const key in kComponentTypeV3ToV2Map) {
  kComponentTypeV2ToV3Map[kComponentTypeV3ToV2Map[key]] = key
}

export interface V2Component {
  cannotClose?: boolean
  dimensions?: {
    width: number
    height: number
  }
  name?: string
  position?: string
  title?: string
  type: string
}
export interface V2Calculator extends V2Component {
  type: "calculator"
}
export interface V2CaseTable extends V2Component {
  dataContext?: string
  horizontalScrollOffset?: number
  isIndexHidden?: boolean
  type: "caseTable"
}
export interface V2Graph extends V2Component {
  dataContext?: string
  enableNumberToggle?: boolean
  legendAttributeName?: string
  numberToggleLastMode?: boolean
  type: "graph"
  xAttributeName?: string
  yAttributeName?: string
  y2AttributeName?: string
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
export interface V2Map extends V2Component {
  center?: [number, number]
  dataContext?: string
  legendAttributeName?: string
  type: "map"
  zoom?: number
}
export interface V2Slider extends V2Component {
  animationDirection?: number
  animationMode?: number
  globalValueName?: string
  lowerBound?: number
  type: "slider"
  upperBound?: number
}
export interface V2Text extends V2Component {
  text?: string
  type: "text"
}
export interface V2WebView extends V2Component {
  type: "webView"
  URL?: string
}

export type V2SpecificComponent = V2Calculator | V2CaseTable | V2Graph | V2Guide | V2Map | V2Slider | V2Text |
  V2WebView
