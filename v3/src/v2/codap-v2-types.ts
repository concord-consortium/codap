import { Descendant, SlateExchangeValue } from "@concord-consortium/slate-editor"
import { RequireExactlyOne } from "type-fest"
import { CodapV2Context, ICodapV2CollectionV3, ICodapV2DataContext } from "./codap-v2-data-context-types"

// when exporting a v3 data set to v2 data context
export interface ICodapV2DataContextV3
  extends Omit<ICodapV2DataContext, "collections"> {
  collections: ICodapV2CollectionV3[]
}

export interface ICodapV2GlobalValue {
  // from DG.GlobalValue.toArchive
  name: string
  value: number
  guid: number
}

export interface IGuidLink<T extends string> {
  type: T
  id: number
}

export function guidLink<T extends string>(type: T, id: number) {
  return { type, id }
}

export interface ICodapV2BaseComponentStorage {
  // from DG.Component.toArchive
  title?: string
  name?: string
  userSetTitle?: boolean
  cannotClose?: boolean
  // allows v2 documents saved by v3 to contain v3-specific enhancements
  v3?: object
}

export interface ICodapV2CalculatorStorage extends ICodapV2BaseComponentStorage {
}

export interface ICodapV2SliderStorage extends ICodapV2BaseComponentStorage {
  // from SliderController.createComponentStorage
  _links_: {
    model: IGuidLink<"DG.GlobalValue">
  },
  lowerBound?: number
  upperBound?: number
  animationDirection?: number
  animationMode?: number
  restrictToMultiplesOf?: number | null
  maxPerSecond?: number | null
  // NOTE: v2 writes out the `userTitle` property, but reads in property `userChangedTitle`.
  // It is also redundant with the `userSetTitle` property shared by all components. ¯\_(ツ)_/¯
  userTitle?: boolean
  // v3 enhancements
  v3?: {
    scaleType: "numeric" | "date",
    multipleOf?: number
    dateMultipleOfUnit?: string
  }
}

export interface ICodapV2RowHeight {
  _links_: {
    collection: IGuidLink<"DG.Collection">
  }
  rowHeight: number
}
export interface ICodapV2TableStorage extends ICodapV2BaseComponentStorage {
  // There are some documents which have broken tables which are not linked to
  // a context
  _links_?: {
    context: IGuidLink<"DG.DataContextRecord">
    collapsedNodes?: IGuidLink<"DG.Case"> | IGuidLink<"DG.Case">[]
  }
  attributeWidths?: Array<{
    _links_: {
      attr: IGuidLink<"DG.Attribute">
    }
    width?: number
  }>
  title?: string
  isActive?: boolean
  rowHeights?: ICodapV2RowHeight[]
  horizontalScrollOffset?: number
  isIndexHidden?: boolean
}

export interface ICodapV2CaseCardStorage extends ICodapV2BaseComponentStorage {
  _links_: {
    context: IGuidLink<"DG.DataContextRecord">
  }
  title?: string
  isActive?: boolean
  columnWidthPct?: string
  columnWidthMap?: Record<string, number>
}

export interface ICodapV2ImageComponentStorage extends ICodapV2BaseComponentStorage {
  title: string
  URL: string
  name: string
}

export interface ICodapV2WebViewStorage extends ICodapV2BaseComponentStorage {
  URL: string
}

export interface ICodapV2GameViewStorage extends ICodapV2BaseComponentStorage {
  currentGameUrl: string
  savedGameState?: unknown
  currentGameName?: string
  // ignore: initialized to true but not used by v2 code
  allowInitGameOverride?: boolean
  preventBringToFront?: boolean
  preventDataContextReorg?: boolean
  preventTopLevelReorg?: boolean
  preventAttributeDeletion?: boolean
  allowEmptyAttributeDeletion?: boolean
  _links_?: {
    context?: IGuidLink<"DG.DataContextRecord">
  }
  // ignore: occurs 62 times in cfm-shared and is always null
  currentGameFormulas?: null
}

export interface ICodapV2GuideViewItem {
  itemTitle: string | null
  url: string | null
}

export interface ICodapV2GuideViewStorage extends ICodapV2BaseComponentStorage {
  // null occurs when the items array is empty
  currentItemIndex?: number | null
  // older versions used these properties rather than currentItemIndex
  currentItemTitle?: string | null
  currentURL?: string | null
  isVisible?: boolean
  items: ICodapV2GuideViewItem[]
}

interface ICodapV2Coordinates {
  x: number
  y: number
}

// In the v2 code, the PlottedAverageAdornment uses `proportionX` and `proportionY`.
// The PlottedAverageAdornment is the base class for the mean, median, MAD, stdDev, stdErr, and normal adornments.
interface ICodapV2ProportionCoordinates {
  proportionX: number
  proportionY: number
}

interface ICodapV2LegacyValueModel {
  isVisible: boolean
  value: number
}

interface ICodapV2LegacyValueModel {
  isVisible: boolean
  value: number
}

export interface ICodapV2Adornment {
  isVisible: boolean
  // graph-wide property that v2 writes out with every adornment _and_ at the graph level
  enableMeasuresForSelection?: boolean
}

interface ICodapV2CountAdornment extends ICodapV2Adornment {
  isShowingCount?: boolean
  isShowingPercent?: boolean
  percentKind?: number
}

export interface ICodapV2MovableValueAdornmentInstance extends ICodapV2Adornment {
  values: Record<string, number>
}

interface _ICodapV2MovableValueAdornment extends ICodapV2Adornment {
  isShowingCount: boolean
  isShowingPercent: boolean
  // Older documents have this `values` property. It has been found in files
  // generated by CODAPv2 from build 0552 to build 0573
  values?: ICodapV2LegacyValueModel[]
  // more recent documents have `valueModels` ¯\_(ツ)_/¯
  valueModels?: ICodapV2MovableValueAdornmentInstance[]
}
type ICodapV2MovableValueAdornment = RequireExactlyOne<_ICodapV2MovableValueAdornment, "values" | "valueModels">

export interface ICodapV2UnivariateAdornment extends ICodapV2Adornment {
  equationCoordsArray?: (ICodapV2ProportionCoordinates | ICodapV2ProportionCenterEquationCoords | null)[]
}

interface ICodapV2StErrAdornment extends ICodapV2UnivariateAdornment {
  numberOfStdErrs: number
}

interface ICodapV2BoxPlotAdornment extends ICodapV2UnivariateAdornment {
  showOutliers?: boolean
  showICI?: boolean
}

interface ICodapV2PlottedFunctionAdornment extends ICodapV2Adornment {
  // redundant but required by v2 code
  adornmentKey?: "plottedFunction"
  expression: string
}

interface ICodapV2PlottedValueAdornment extends ICodapV2Adornment {
  // redundant but required by v2 code
  adornmentKey?: "plottedValue"
  expression: string
}

export interface ICodapV2SimpleAdornmentsMap {
  connectingLine?: ICodapV2Adornment
  multipleMovableValues?: ICodapV2MovableValueAdornment
  plottedBoxPlot?: ICodapV2BoxPlotAdornment
  plottedCount?: ICodapV2CountAdornment
  plottedFunction?: ICodapV2PlottedFunctionAdornment
  plottedMad?: ICodapV2UnivariateAdornment
  plottedMean?: ICodapV2UnivariateAdornment
  plottedMedian?: ICodapV2UnivariateAdornment
  plottedNormal?: ICodapV2UnivariateAdornment
  plottedStDev?: ICodapV2UnivariateAdornment
  plottedStErr?: ICodapV2StErrAdornment
  plottedValue?: ICodapV2PlottedValueAdornment
}

interface ICodapV2MovablePointAdornment extends ICodapV2Adornment {
  coordinates: ICodapV2Coordinates
}

// In v2 code, `proportionCenterX` and `proportionCenterY` are only used in the `TwoDLineAdornment`,
// which is used for the `MovableLineAdornment` and `LSRLAdornment`.
interface ICodapV2ProportionCenterEquationCoords {
  proportionCenterX: number
  proportionCenterY: number
}

interface ICodapV2MovableLineAdornmentBase extends ICodapV2Adornment {
  isInterceptLocked: boolean
  equationCoords?: ICodapV2ProportionCenterEquationCoords | null
}

interface ICodapV2NormalMovableLineAdornment extends ICodapV2MovableLineAdornmentBase {
  intercept: number
  slope: number
  isVertical: false
  xIntercept: null
}

interface ICodapV2VerticalMovableLineAdornment extends ICodapV2MovableLineAdornmentBase {
  intercept: null
  slope: null
  isVertical: true
  xIntercept: number
}

export type ICodapV2MovableLineAdornment = ICodapV2NormalMovableLineAdornment | ICodapV2VerticalMovableLineAdornment

export interface ICodapV2LSRLInstance extends ICodapV2Adornment {
  // this is a graph-wide property that is redundantly stored with each instance
  isInterceptLocked: boolean
  equationCoords?: ICodapV2ProportionCenterEquationCoords | null,
  // this is an adornment-wide property that is redundantly stored with each instance
  showConfidenceBands?: boolean
}

export interface ICodapV2MultipleLSRLAdornments extends ICodapV2Adornment {
  // seems to be redundant with the `areSquaresVisible` property stored in plotModelStorage
  showSumSquares?: boolean
  // this is a graph-wide property that is redundantly stored with each adornment and instance
  isInterceptLocked: boolean
  showConfidenceBands?: boolean
  lsrls?: ICodapV2LSRLInstance[]
}

export interface ICodapV2PlotStorageBase {
  // TODO_V2_IMPORT: verticalAxisIsY2 is not imported
  // it is true 2,859 times in cfm-shared
  verticalAxisIsY2?: boolean
  adornments?: ICodapV2SimpleAdornmentsMap
  showMeasureLabels?: boolean
}

export interface ICodapV2BarChartStorage extends ICodapV2PlotStorageBase {
  // For non-computed bar charts, whether to show count (0) or percent (1)
  breakdownType?: number
}

export interface ICodapV2ComputedBarChartStorage extends ICodapV2BarChartStorage {
  // For computed bar charts, the formula to compute the value of each bar
  expression?: string
}

export interface ICodapV2BinnedPlotStorage extends ICodapV2PlotStorageBase {
  // For binned dot plot, width of bins
  width?: number
  // For binned dot plot, alignment of bins
  alignment?: number
  // For binned dot plot, true for histogram, false for dot plot
  dotsAreFused?: boolean
  // For binned dot plot, number of bins required to contain the data; computable from data
  totalNumberOfBins?: number
}

export interface ICodapV2ScatterPlotStorage extends ICodapV2PlotStorageBase {
  areSquaresVisible?: boolean
  isLSRLVisible?: boolean
  // lsrLineStorage is presumably a legacy format that predates multipleLSRLsStorage
  // it does not appear to be imported by v2
  lsrLineStorage?: ICodapV2LSRLInstance
  movableLineStorage?: ICodapV2MovableLineAdornment
  movablePointStorage?: ICodapV2MovablePointAdornment
  multipleLSRLsStorage?: ICodapV2MultipleLSRLAdornments
}

export interface ICodapV2PlotModelBase {
  plotClass: string
  plotModelStorage: ICodapV2PlotStorageBase
}

interface ICodapV2PlotModelType<
  TClass extends string, TStorage extends ICodapV2PlotStorageBase> extends ICodapV2PlotModelBase {
  plotClass: TClass
  plotModelStorage: TStorage
}

export type ICodapV2BarChartModel = ICodapV2PlotModelType<"DG.BarChartModel", ICodapV2BarChartStorage>
export type ICodapV2BinnedPlotModel = ICodapV2PlotModelType<"DG.BinnedPlotModel", ICodapV2BinnedPlotStorage>
export type ICodapV2CasePlotModel = ICodapV2PlotModelType<"DG.CasePlotModel", ICodapV2PlotStorageBase>
export type ICodapV2ComputedBarChartModel =
  ICodapV2PlotModelType<"DG.ComputedBarChartModel", ICodapV2ComputedBarChartStorage>
export type ICodapV2DotChartModel = ICodapV2PlotModelType<"DG.DotChartModel", ICodapV2PlotStorageBase>
export type ICodapV2DotPlotModel = ICodapV2PlotModelType<"DG.DotPlotModel", ICodapV2PlotStorageBase>
// for dot plots showing a bar for each point
export type ICodapV2LinePlotModel = ICodapV2PlotModelType<"DG.LinePlotModel", ICodapV2PlotStorageBase>
export type ICodapV2ScatterPlotModel = ICodapV2PlotModelType<"DG.ScatterPlotModel", ICodapV2ScatterPlotStorage>

export type ICodapV2PlotModel =
  | ICodapV2BarChartModel
  | ICodapV2BinnedPlotModel
  | ICodapV2CasePlotModel
  | ICodapV2ComputedBarChartModel
  | ICodapV2DotChartModel
  | ICodapV2DotPlotModel
  | ICodapV2LinePlotModel
  | ICodapV2ScatterPlotModel

export type CodapV2PlotType = ICodapV2PlotModel["plotClass"]

export function isV2BarChartModel(plotModel: ICodapV2PlotModel): plotModel is ICodapV2BarChartModel {
  return ["DG.BarChartModel", "DG.ComputedBarChartModel"].includes(plotModel.plotClass)
}

export function isV2BinnedPlotModel(plotModel: ICodapV2PlotModel): plotModel is ICodapV2BinnedPlotModel {
  return plotModel.plotClass === "DG.BinnedPlotModel"
}

export function isV2ScatterPlotModel(plotModel: ICodapV2PlotModel): plotModel is ICodapV2ScatterPlotModel {
  return plotModel.plotClass === "DG.ScatterPlotModel"
}

export interface ICodapV2GraphBackgroundLockInfo {
  locked: true
  xAxisLowerBound: number
  xAxisUpperBound: number
  yAxisLowerBound: number
  yAxisUpperBound: number
}

export interface ICodapV2GraphStorage extends ICodapV2BaseComponentStorage {
  _links_: {
    context?: IGuidLink<"DG.DataContextRecord">
    hiddenCases?: IGuidLink<"DG.Case">[]
    // In V2, *Coll is used to find the attribute, so we need to export them.
    // In V3, we use the attribute ID directly so we don't need to import them.
    xColl?: IGuidLink<"DG.Collection" | "DG.CollectionRecord">
    xAttr?: IGuidLink<"DG.Attribute">
    yColl?: IGuidLink<"DG.Collection" | "DG.CollectionRecord">
    yAttr?: IGuidLink<"DG.Attribute"> | Array<IGuidLink<"DG.Attribute">>
    y2Coll?: IGuidLink<"DG.Collection">
    y2Attr?: IGuidLink<"DG.Attribute">
    rightColl?: IGuidLink<"DG.Collection">
    rightAttr?: IGuidLink<"DG.Attribute">
    topColl?: IGuidLink<"DG.Collection">
    topAttr?: IGuidLink<"DG.Attribute">
    legendColl?: IGuidLink<"DG.Collection" | "DG.CollectionRecord">
    legendAttr?: IGuidLink<"DG.Attribute">
  }
  displayOnlySelected?: boolean
  legendRole: number
  legendAttributeType: number
  numberOfLegendQuantiles?: number
  legendQuantilesAreLocked?: boolean
  legendQuantiles?: number[] | null[] // null occurs in some documents, presumably as a result of a bug
  pointColor?: string
  strokeColor?: string
  pointSizeMultiplier?: number
  transparency?: number
  strokeTransparency?: number
  strokeSameAsFill?: boolean
  isTransparent?: boolean
  plotBackgroundColor?: string | null
  plotBackgroundOpacity?: number
  plotBackgroundImageLockInfo?: ICodapV2GraphBackgroundLockInfo | null
  plotBackgroundImage?: string | null

  xRole: number
  xAttributeType: number
  xAxisClass: string
  // TODO_V2_IMPORT: it looks like undefined and null might not be handled correctly
  // for *LowerBound and *UpperBound when the *AxisClass is DG.CellLinearAxisModel.
  // There are 966 instances of `xUpperBound: null` in cfm-shared
  xLowerBound?: number | null
  xUpperBound?: number | null

  yRole: number
  yAttributeType: number
  yAxisClass: string
  yLowerBound?: number | null
  yUpperBound?: number | null

  y2Role?: number
  y2AttributeType?: number
  y2AxisClass?: string
  y2LowerBound?: number | null
  y2UpperBound?: number | null

  topRole?: number
  topAttributeType?: number
  topAxisClass?: string

  rightRole?: number
  rightAttributeType?: number
  rightAxisClass?: string

  plotModels: ICodapV2PlotModel[]
  enableNumberToggle?: boolean | null
  numberToggleLastMode?: boolean

  // `enableMeasuresForSelection` is a graph-wide property, so storing it here is perfectly reasonable.
  // For implementation reasons, it is communicated to every adornment independently, where it is then
  // stored redundantly in the adornment's storage. All of the values of the `enableMeasuresForSelection`
  // property should be the same for a given graph, and so it can safely be ignored when importing
  // individual adornments. On export, it should be written out redundantly for all adornments.
  enableMeasuresForSelection?: boolean | null

  hiddenCases?: number[]

  // v3 extensions
  v3?: {
    filterFormula?: string
  }
}

// This is differentiated from the current storage because it has no
// layerModels and it has a legendRole
interface ICodapV2MapLegacyStorage extends ICodapV2BaseComponentStorage {
  // [begin] legacy top-level properties ignored by current v2 code
  _links_: {
    context?: IGuidLink<"DG.DataContextRecord">
    legendColl?: IGuidLink<"DG.Collection">
    legendAttr?: IGuidLink<"DG.Attribute">
    hiddenCases?: any[]
  }
  legendRole: number
  legendAttributeType: number
  pointColor?: string
  strokeColor?: string
  pointSizeMultiplier?: number
  transparency?: number
  strokeTransparency?: number
  // [end] legacy top-level properties ignored by current v2 code

  mapModelStorage: {
    center: { lat: number, lng: number } | [lat: number, lng: number]
    zoom: number
    baseMapLayerName: string
    gridMultiplier?: number

    // [begin] legacy mapModelStorage properties ignored by current v2 code
    pointsShouldBeVisible?: boolean
    linesShouldBeVisible?: boolean
    grid: {
      gridMultiplier: number
      visible: boolean
    }
    areaColor?: string
    areaTransparency?: string | number // e.g. "0.5"
    areaStrokeColor?: string
    areaStrokeTransparency?: string | number // e.g. "0.6"
    // [end] legacy mapModelStorage properties ignored by current v2 code
  }
}
export function isV2MapLegacyStorage(obj: unknown): obj is ICodapV2MapCurrentStorage {
  return !!obj && typeof obj === "object" && "legendRole" in obj && obj.legendRole != null
}

export interface ICodapV2MapLayerBaseStorage {
  _links_: {
    context: IGuidLink<"DG.DataContextRecord">
    hiddenCases?: IGuidLink<"DG.Case">[],
    legendColl?: IGuidLink<"DG.Collection">,
    // From the shared documents archive, it appears that when this is an array, it's a two-
    // element array with two identical items, so simply using the first item is sufficient.
    legendAttr?: IGuidLink<"DG.Attribute"> | IGuidLink<"DG.Attribute">[],
    // tHiddenCases was briefly used in lieu of hiddenCases
    tHiddenCases?: IGuidLink<"DG.Case">[]
  }
  legendRole: number
  legendAttributeType: number
  isVisible: boolean
  strokeSameAsFill?: boolean

  // v3 extensions
  v3?: {
    filterFormula?: string
  }
}

export interface ICodapV2MapPointLayerStorage extends ICodapV2MapLayerBaseStorage {
  pointColor: string
  strokeColor: string
  pointSizeMultiplier: number
  transparency: number
  strokeTransparency: number
  pointsShouldBeVisible: boolean
  grid: {
    gridMultiplier: number
    isVisible?: boolean
  }
  connectingLines: {
    isVisible: boolean,
    // `enableMeasuresForSelection` is a graph property that isn't relevant to the map.
    // Presumably, it is sharing a model with the graph which is responsible for serialization.
    enableMeasuresForSelection?: boolean
  }
  // v2 saves/restores this value, but never uses it
  linesShouldBeVisible?: boolean
}
export function isV2MapPointLayerStorage(obj: unknown): obj is ICodapV2MapPointLayerStorage {
  return !!obj && typeof obj === "object" && "pointColor" in obj && obj.pointColor != null
}

export interface ICodapV2MapPolygonLayerStorage extends ICodapV2MapLayerBaseStorage {
  areaColor: string
  areaTransparency: number | string // e.g. "0.5"
  areaStrokeColor: string
  areaStrokeTransparency: number | string // e.g. "0.6"
}
export function isV2MapPolygonLayerStorage(obj: unknown): obj is ICodapV2MapPolygonLayerStorage {
  return !!obj && typeof obj === "object" && "areaColor" in obj && obj.areaColor != null
}

export type ICodapV2MapLayerStorage = ICodapV2MapPointLayerStorage | ICodapV2MapPolygonLayerStorage

export interface ICodapV2MapCurrentStorage extends ICodapV2BaseComponentStorage {
  mapModelStorage: {
    center: { lat: number, lng: number } | [lat: number, lng: number]
    zoom: number
    baseMapLayerName: string
    gridMultiplier: number
    layerModels: ICodapV2MapLayerStorage[]
  }
}
export function isV2MapCurrentStorage(obj: unknown): obj is ICodapV2MapCurrentStorage {
  if (!!obj && typeof obj === "object" && "mapModelStorage" in obj) {
    const mapModelStorage = obj.mapModelStorage
    if (!!mapModelStorage && typeof mapModelStorage === "object" && "layerModels" in mapModelStorage) {
      return Array.isArray(mapModelStorage.layerModels)
    }
  }
  return false
}

export type ICodapV2MapStorage = ICodapV2MapLegacyStorage | ICodapV2MapCurrentStorage

export type V2TextObjTypesMap = Record<string, "block" | "inline">

export interface V2SlateExchangeValue extends Omit<SlateExchangeValue, "document"> {
  document: {
    children: Descendant[]
    // legacy v2 documents require an objTypes map property
    objTypes: V2TextObjTypesMap
  }
}

export interface ICodapV2TextStorage extends ICodapV2BaseComponentStorage {
  text?: string
  // v2's TextController.restoreComponentStorage references an `apiText` property,
  // but TextController.createComponentStorage doesn't write one out and there are
  // no instances of such a property in the shared documents archive. ¯\_(ツ)_/¯
  // apiText: string
}

export interface ICodapV2BaseComponent {
  type: string  // e.g. "DG.TableView", "DG.GraphView", "DG.GuideView", etc.
  guid: number
  id?: number
  componentStorage?: ICodapV2BaseComponentStorage | null
  layout: {
    // A GameView saved by build 0606 had no width or height
    width?: number
    height?: number
    left?: number
    top?: number
    isVisible?: boolean
    zIndex?: number
    // Skipping import of right and bottom because it is not used in existing V2 documents
    right?: number | null
    bottom?: number | null
    // There are some V2 documents that use x and y instead of left and top
    x?: number
    y?: number

    // These *Orig properties only occur in a single file in cfm-shared
    // They are retained here for completeness but we will not import/export them.
    // leftOrig?: number
    // topOrig?: number
    // widthOrig?: number
    // heightOrig?: number
  }
  savedHeight?: number | null
}

export interface ICodapV2CalculatorComponent extends ICodapV2BaseComponent {
  type: "DG.Calculator"
  componentStorage?: ICodapV2CalculatorStorage | null
}
export const isV2CalculatorComponent = (component: ICodapV2BaseComponent): component is ICodapV2CalculatorComponent =>
  component.type === "DG.Calculator"

export interface ICodapV2SliderComponent extends ICodapV2BaseComponent {
  type: "DG.SliderView",
  componentStorage: ICodapV2SliderStorage
}
export const isV2SliderComponent = (component: ICodapV2BaseComponent): component is ICodapV2SliderComponent =>
  component.type === "DG.SliderView"

export interface ICodapV2TableComponent extends ICodapV2BaseComponent {
  type: "DG.TableView"
  componentStorage: ICodapV2TableStorage
}
export const isV2TableComponent = (component: ICodapV2BaseComponent): component is ICodapV2TableComponent =>
  component.type === "DG.TableView"

export interface ICodapV2CaseCardComponent extends ICodapV2BaseComponent {
  type: "DG.CaseCard"
  componentStorage: ICodapV2CaseCardStorage
}
export const isV2CaseCardComponent = (component: ICodapV2BaseComponent): component is ICodapV2CaseCardComponent =>
  component.type === "DG.CaseCard"

export interface ICodapV2WebViewComponent extends ICodapV2BaseComponent {
  type: "DG.WebView"
  componentStorage: ICodapV2WebViewStorage
}
export const isV2WebViewComponent =
  (component: ICodapV2BaseComponent): component is ICodapV2WebViewComponent => component.type === "DG.WebView"

export interface ICodapV2GameViewComponent extends ICodapV2BaseComponent {
  type: "DG.GameView"
  componentStorage: ICodapV2GameViewStorage
}
export const isV2GameViewComponent =
  (component: ICodapV2BaseComponent): component is ICodapV2GameViewComponent => component.type === "DG.GameView"

export interface ICodapV2GuideViewComponent extends ICodapV2BaseComponent {
  type: "DG.GuideView"
  componentStorage: ICodapV2GuideViewStorage
}
export const isV2GuideViewComponent = (component: ICodapV2BaseComponent): component is ICodapV2GuideViewComponent =>
              component.type === "DG.GuideView"

export interface ICodapV2ImageViewComponent extends ICodapV2BaseComponent {
  type: "DG.ImageComponentView"
  componentStorage: ICodapV2ImageComponentStorage
}
export const isV2ImageViewComponent = (component: ICodapV2BaseComponent): component is ICodapV2ImageViewComponent =>
              component.type === "DG.ImageComponentView"

export interface ICodapV2GraphComponent extends ICodapV2BaseComponent {
  type: "DG.GraphView"
  componentStorage: ICodapV2GraphStorage
}
export const isV2GraphComponent = (component: ICodapV2BaseComponent): component is ICodapV2GraphComponent =>
              component.type === "DG.GraphView"

export interface ICodapV2MapComponent extends ICodapV2BaseComponent {
  type: "DG.MapView"
  componentStorage: ICodapV2MapStorage
}
export const isV2MapComponent = (component: ICodapV2BaseComponent): component is ICodapV2MapComponent =>
              component.type === "DG.MapView"

export interface ICodapV2TextComponent extends ICodapV2BaseComponent {
  type: "DG.TextView"
  componentStorage: ICodapV2TextStorage
}
export const isV2TextComponent = (component: ICodapV2BaseComponent): component is ICodapV2TextComponent =>
              component.type === "DG.TextView"

export type CodapV2Component =
  ICodapV2CalculatorComponent |
  ICodapV2CaseCardComponent|
  ICodapV2GameViewComponent |
  ICodapV2GraphComponent |
  ICodapV2GuideViewComponent |
  ICodapV2ImageViewComponent |
  ICodapV2MapComponent |
  ICodapV2SliderComponent |
  ICodapV2TableComponent |
  ICodapV2TextComponent |
  ICodapV2WebViewComponent
export type CodapV2ComponentStorage = CodapV2Component["componentStorage"]

export interface ICodapV2DocumentJson {
  type?: string         // "DG.Document"
  id?: number
  guid: number
  name?: string | null
  appName: string       // "DG"
  appVersion: string
  appBuildNum: string
  metadata?: Record<string, any>
  // these three are maintained as maps internally but serialized as arrays
  components: CodapV2Component[]
  contexts: CodapV2Context[]
  globalValues: ICodapV2GlobalValue[]
  lang?: string
  idCount?: number

  // Ignored - appears to be 1 if shared, 0 if not shared
  // a comment in the code suggests that it might have mattered to the document-store
  _permissions?: number
}

// short for DataGames, the name of the project under which CODAP development began
export const kV2AppName = "DG"

export function isCodapV2Document(content: unknown): content is ICodapV2DocumentJson {
  if (!content || typeof content !== "object") return false
  const hasV2AppName = "appName" in content && content.appName === kV2AppName
  const hasNoAppName = !("appName" in content) || !content.appName
  return ((hasV2AppName || hasNoAppName) &&
          "components" in content && Array.isArray(content.components) &&
          "contexts" in content && Array.isArray(content.contexts))
}
