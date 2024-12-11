import { SlateExchangeValue } from "@concord-consortium/slate-editor"
import { kCalculatorTileType, kV2CalculatorDIType } from "../components/calculator/calculator-defs"
import { kCaseCardTileType, kV2CaseCardType } from "../components/case-card/case-card-defs"
import { kCaseTableTileType, kV2CaseTableType } from "../components/case-table/case-table-defs"
import { kGraphTileType, kV2GraphType } from "../components/graph/graph-defs"
import { kMapTileType, kV2MapType } from "../components/map/map-defs"
import { kSliderTileType, kV2SliderType } from "../components/slider/slider-defs"
import { kTextTileType, kV2TextType } from "../components/text/text-defs"
import { kV2GameType, kV2WebViewType, kWebViewTileType } from "../components/web-view/web-view-defs"

// export const kV2ImageType = "image"
// export const kV2TextType = "text"

export const kComponentTypeV3ToV2Map: Record<string, string> = {
  [kCalculatorTileType]: kV2CalculatorDIType,
  [kCaseTableTileType]: kV2CaseTableType,
  [kCaseCardTileType]: kV2CaseCardType,
  [kGraphTileType]: kV2GraphType,
  // kV2GuideViewType
  // kV2ImageType
  [kMapTileType]: kV2MapType,
  [kSliderTileType]: kV2SliderType,
  [kTextTileType]: kV2TextType,
  [kWebViewTileType]: kV2WebViewType
}

export const kComponentTypeV2ToV3Map: Record<string, string> = {
  [kV2GameType]: kWebViewTileType
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
export interface V2Game extends V2Component {
  type: "game"
  URL?: string
}
export interface V2Graph extends V2Component {
  captionAttributeID?: string | null
  captionAttributeName?: string | null
  dataContext?: string
  enableNumberToggle?: boolean
  legendAttributeID?: string | null
  legendAttributeName?: string | null
  numberToggleLastMode?: boolean
  rightNumericAttributeID?: string | null
  rightNumericAttributeName?: string | null
  rightSplitAttributeID?: string | null
  rightSplitAttributeName?: string | null
  topSplitAttributeID?: string | null
  topSplitAttributeName?: string | null
  type: "graph"
  xAttributeID?: string | null
  xAttributeName?: string | null
  yAttributeID?: string | null
  yAttributeIDs?: number[]
  yAttributeName?: string | null
  yAttributeNames?: string[]
  y2AttributeID?: string | null
  y2AttributeName?: string | null
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
export interface V2GetSlider extends V2Slider {
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
