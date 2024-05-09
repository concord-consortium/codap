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

export interface V2CaseTable {
  type: "caseTable"
  name?: string
  title?: string
  dimensions?: {
    width: number
    height: number
  }
  position?: string
  cannotClose?: boolean
  dataContext?: string
  horizontalScrollOffset?: number
  isIndexHidden?: boolean
}

export type V2Component = V2CaseTable
