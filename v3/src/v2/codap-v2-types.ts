import { SetOptional } from "type-fest"
import { AttributeType } from "../models/data/attribute-types"

export interface ICodapV2Attribute {
  guid: number
  id?: number
  name: string
  type?: string | null
  title?: string
  cid?: string
  defaultMin?: number
  defaultMax?: number
  description?: string | null
  categoryMap?: any
  _categoryMap?: any
  colormap?: any
  _colormap?: any
  blockDisplayOfEmptyCategories?: boolean
  // plugin bugs have led to documents in the field with values like `[true]`
  editable?: boolean | unknown
  hidden?: boolean
  renameable?: boolean
  deleteable?: boolean
  formula?: string
  deletedFormula?: string
  precision?: number | string | null
  unit?: string | null
  // TODO_V2_IMPORT decimals is not imported
  // it occurs 604 times in 36 files in cfm-shared
  // in 33 cases the value is "2"
  // the rest of the cases the value is "0"
  decimals?: string
}

export function isCodapV2Attribute(o: unknown): o is ICodapV2Attribute {
  return !!o && typeof o === "object" && "type" in o && o.type === "DG.Attribute"
}

export const v3TypeFromV2TypeIndex: Array<AttributeType | undefined> = [
  // indices are numeric values of v2 types
  undefined, "numeric", "categorical", "date", "boundary", "color"
  // v2 type eNone === 0 which v3 codes as undefined
]

export function v3TypeFromV2TypeString(v2Type?: string | null): AttributeType | undefined {
  if (v2Type == null || v2Type === "none") return undefined
  if (v2Type === "nominal") return "categorical"
  return v2Type as AttributeType
}


type CaseValue = number | string | boolean | null | object

export interface ICodapV2Case {
  id?: number
  guid: number
  itemID?: string
  parent?: number
  values: Record<string, CaseValue>
}

export interface ICodapV2Collection {
  attrs: ICodapV2Attribute[]
  cases: ICodapV2Case[]
  // TODO_V2_IMPORT: caseName is not imported
  // There are 2,500 cases where this has a value in cfm-shared
  caseName?: string | null
  // TODO_V2_IMPORT: childAttrName is not imported
  // There are 8,592 cases where this has a value in cfm-shared
  childAttrName?: string | null
  cid?: string
  // TODO_V2_IMPORT: collapseChildren is not imported
  // There are 250 cases where this is true in cfm-shared
  collapseChildren?: boolean | null
  // TODO_V2_IMPORT: defaults does not seem to be imported
  // There are 825 cases where it is defined in cfm-shared
  defaults?: {
    xAttr?: string
    yAttr?: string
  }
  guid: number
  id?: number
  // TODO_V2_IMPORT: labels seem to be handled by the plugin api, and stored in v3 structures but
  // they don't seem to be imported when opening a v2 document
  labels?: {
    singleCase?: string
    pluralCase?: string
    singleCaseWithArticle?: string
    setOfCases?: string
    setOfCasesWithArticle?: string
  }
  name: string
  parent?: number
  title?: string | null
  type?: "DG.Collection"
  // TODO_V2_IMPORT areParentChildLinksConfigured is not imported
  // it is true 5,000 times in 2,812 files in cfm-shared
  // it is false at least 20,000 times
  // it might not be optional
  areParentChildLinksConfigured?: boolean
}
// when exporting a v3 collection to v2
type CollectionNotYetExported = "cases" | "caseName" | "childAttrName" | "collapseChildren"
export interface ICodapV2CollectionV3
  extends SetOptional<Omit<ICodapV2Collection, "attrs">, CollectionNotYetExported> {
  attrs: ICodapV2Attribute[]
}

export interface ICodapV2SetAsideItem {
  id: string  // item id
  values: Record<string, number | string>
}

export const isV2SetAsideItem = (item: unknown): item is ICodapV2SetAsideItem =>
  !!(item && typeof item === "object" && "id" in item && "values" in item)

export interface ICodapV2ExternalContext {
  externalDocumentId: string
}
export interface ICodapV2DataContextMetadata {
  description?: string
  // TODO_V2_IMPORT data context metadata source is not imported
  // unknown how many instances in this location
  source?: string
  // TODO_V2_IMPORT data context metadata importDate is not imported
  // at least 20,000 instances in cfm-shared
  importDate?: string
  // TODO_V2_IMPORT "import date" is not imported
  // 2,025 instances in cfm-shared
  "import date"?: string
}
export interface ICodapV2DataContext {
  type: "DG.DataContext"
  document?: number // id of containing document
  guid: number
  // TODO_V2_IMPORT do we need to import id so we can export it
  // it again?
  // It is not always present in v2 files.
  id?: number
  // TODO_V2_IMPORT flexibleGroupingChangeFlag is not imported
  // This is set to true in 11,000 cfm-shared files
  flexibleGroupingChangeFlag?: boolean | null
  name?: string
  title?: string
  collections: ICodapV2Collection[]
  description?: string
  metadata?: ICodapV2DataContextMetadata | null
  // TODO_V2_IMPORT preventReorg is not imported
  // it is false at least 20,000 times
  // it is true 969 times in 316 files
  preventReorg?: boolean
  // setAsideItems sometimes just has the values directly
  // as the items in the array
  // There are more than 20,000 instances of "setAsideItems" in cfm-shared
  // 3,526 of these arrays have a first object in with an "id" field
  // more than 20,000 are empty arrays
  // 259 of these arrays have a first object that doesn't have an "id" field
  setAsideItems?: ICodapV2SetAsideItem[] | Record<string, number | string>[]
  contextStorage: ICodapV2DataContextStorage
  // TODO_V2_IMPORT we are ignoring _permissions. It seems like a CFM
  // artifact
  _permissions?: any
}

export interface ICodapV2DataContextSelectedCase {
  type: string
  id: number
}

export interface ICodapV2DataContextStorage {
  _links_?: {
    // TODO_V2_IMPORT selectedCases is not imported
    // they appear at lest 20,000 times perhaps both in game context and data context
    // The value is an empty array 11,300 times
    selectedCases: ICodapV2DataContextSelectedCase[]
  }
}
export interface ICodapV2GameContextStorage extends ICodapV2DataContextStorage {
  gameName?: string | null
  gameUrl?: string | null
  gameState?: any
}

// TODO_V2_IMPORT: we don't fully handle the GameContext
// It seems it is legacy version of the DataContext specific for plugins.
// v2 can open documents with GameContext objects.
// There are about 4,000 documents in cfm-shared with a GameContext.
// If v2 opens a document with a GameContext it will preserve it when
// saving the document.
// In v3 the "dataset" of the GameContext will be loaded but the
// plugin state will be ignored.
//
// Here is an example document using the Markov plugin:
// cfm-shared/0b5715a7dab0a92ef332c8407bf51c53cc3ae710/file.json
// It has gameState in the GameContext
// It restores the gameState in v2
//
// An example with Next Gen MW games:
// cfm-shared/0b65185859c238170055bde1fef60830e52bd63d49bec96e0b1db84c65ea3356/file.json
// - this document cannot be opened by CODAP build 0730
//
// Here is one with the CartWeight plugin:
// cfm-shared/1d38b1c8597644dfee50687adc66661a55b0ca21/file.json
// It opens in v2 and has saved game state and saved cases (you need to open the table)
//
// Here is one with Sage Modeler:
// cfm-shared/003a3f0c482fdda8c9d3a7ac77ddfcbb9375420b/file.json
//
// There are also documents that are just GameContext nothing else:
// cfm-shared/19a5cbdb252a03e168d5b7541f70189ff6b47381ec70842e1bd4a7beef0bb42f/file.json
export interface ICodapV2GameContext extends Omit<ICodapV2DataContext, "type"> {
  type: "DG.GameContext"
  contextStorage: ICodapV2GameContextStorage
}

// when exporting a v3 data set to v2 data context
type DCNotYetExported = "flexibleGroupingChangeFlag" | "contextStorage"
export interface ICodapV2DataContextV3
  extends SetOptional<Omit<ICodapV2DataContext, "collections">, DCNotYetExported> {
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

export interface ICodapV2BaseComponentStorage {
  // from DG.Component.toArchive
  title?: string
  name?: string
  userSetTitle?: boolean
  // in a document saved by build 0441 this property didn't exist
  // TODO_V2_IMPORT: this property seems to be ignored by the import code
  // The v3 models do support it, but from what I can tell each component
  // importer needs to read this property from componentStorage and then
  // set it on the tile snapshot they pass to insertTile
  // In the CFM shared files there are more than 20,000 examples of cannotClose: true
  // and more 20,000 examples cannotClose: false
  cannotClose?: boolean
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
  userTitle?: boolean
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
    // TODO_V2_IMPORT collapsedNodes is not imported
    // it appears 1,518 times in cfm-shared
    // none of those times are empty arrays
    collapsedNodes?: IGuidLink<"DG.Case"> | IGuidLink<"DG.Case">[]
  }
  attributeWidths?: Array<{
    _links_: {
      attr: IGuidLink<"DG.Attribute">
    }
    width?: number
  }>
  title?: string
  // TODO_V2_IMPORT isActive is not imported
  // it occurs in close to 11,0000 files in cfm-shared
  // these are both in table and case card
  // it might not be optional
  isActive?: boolean
  // TODO_V2_IMPORT rowHeights is not imported
  // it occurs more than 20,000 times in cfm-shared
  // more than 4,200 of those have non-empty arrays
  // it might not be optional
  rowHeights?: ICodapV2RowHeight[]
  // TODO_V2_IMPORT horizontalScrollOffset is not imported
  // it occurs more than 20,000 times in cfm-shared
  // more than 20,000 of those times it has a value other than 0
  horizontalScrollOffset?: number
  // TODO_V2_IMPORT isIndexHidden is not imported
  // it occurs more than 20,000 times in cfm-shared
  // it is true 4,346 times
  isIndexHidden?: boolean
}

export interface ICodapV2CaseCardStorage extends ICodapV2BaseComponentStorage {
  _links_: {
    context: IGuidLink<"DG.DataContextRecord">
  }
  title?: string
  // TODO_V2_IMPORT isActive is not imported
  // it occurs in close to 11,0000 files in cfm-shared
  // these are both in table and case card
  // it might not be optional
  isActive?: boolean
  // TODO_V2_IMPORT columnWidthPct is not imported
  // it occurs 39 times in cfm-shared
  columnWidthPct?: string
  // TODO_V2_IMPORT columnWidthMap is not imported
  // it occurs 843 times in cfm-shared
  columnWidthMap?: Record<string, number>
}

export interface ICodapV2ImageStorage extends ICodapV2BaseComponentStorage {
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
  // TODO_V2_IMPORT currentGameName is not imported
  // it occurs in 17,000 files in cfm-shared
  // it might not be optional
  currentGameName?: string
  // TODO_V2_IMPORT allowInitGameOverride is not imported
  // it occurs in at least 12,500 files in cfm-shared
  // there are no instances of it being set to false
  // it might not be optional
  allowInitGameOverride?: boolean
  // TODO_V2_IMPORT preventBringToFront is not imported
  // it occurs in at least 19,7000 files in cfm-shared
  // there are at least 8,000 instances where it is false
  // it might not be optional
  preventBringToFront?: boolean
  // TODO_V2_IMPORT preventDataContextReorg is not imported
  // there are at least 20,000 instances where it is false
  // and at least 20,000 instances where it is true
  // it might not be optional
  preventDataContextReorg?: boolean
  // TODO_V2_IMPORT preventTopLevelReorg is not imported
  // there are only 11 instances in 9 files where it is true
  // and at least 20,000 instances where it is false
  // it might not be optional
  preventTopLevelReorg?: boolean
  // TODO_V2_IMPORT preventAttributeDeletion is not imported
  // there are only 4 instances in 3 files where it is true
  // and at least 20,000 instances where it is false
  // it might not be optional
  preventAttributeDeletion?: boolean
  // TODO_V2_IMPORT allowEmptyAttributeDeletion is not imported
  // there are only 41 instances in 33 files where it is true
  // and at least 20,000 instances where it is false
  // it might not be optional
  allowEmptyAttributeDeletion?: boolean
  // TODO_V2_IMPORT _links_ is not imported
  // unknown how many times it is used in this location
  _links_?: {
    context?: IGuidLink<"DG.DataContextRecord">
  }
  // currentGameFormulas occurs 62 times in cfm-shared and is always null
  currentGameFormulas?: null
}

interface ICodapV2Coordinates {
  x: number
  y: number
}

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

// TODO_V2_IMPORT: enableMeasuresForSelection is not imported
// There are 1,600 files in cfm-shared that have it set to true
// It can be set in various places within a v2 document

interface ICodapV2ValueModel {
  isVisible: boolean
  enableMeasuresForSelection?: boolean
  values: Record<string, number>
}

interface ICodapV2Adornment {
  isVisible: boolean
  enableMeasuresForSelection?: boolean
}

interface ICodapV2CountAdornment extends ICodapV2Adornment {
  isShowingCount?: boolean
  isShowingPercent?: boolean
  percentKind?: number
}

interface ICodapV2MovableValueAdornment extends ICodapV2Adornment {
  isShowingCount: boolean
  isShowingPercent: boolean
  // Older documents have this `values` property. It has been found in files
  // generated by CODAPv2 from build 0552 to build 0573
  values?: ICodapV2LegacyValueModel[]
  // more recent documents have `valueModels` ¯\_(ツ)_/¯
  valueModels?: ICodapV2ValueModel[]
}

export interface ICodapV2UnivariateAdornment extends ICodapV2Adornment {
  // TODO_V2_IMPORT: there are 267 instances in cfm-shared where
  // the equationCoordsArray has items with the type of ICodapV2LineEquationCoords
  equationCoordsArray?: (ICodapV2ProportionCoordinates | ICodapV2LineEquationCoords | null)[]
}

interface ICodapV2StErrAdornment extends ICodapV2UnivariateAdornment {
  numberOfStdErrs: number
}

interface ICodapV2BoxPlotAdornment extends ICodapV2UnivariateAdornment {
  showOutliers?: boolean
  // TODO_V2_IMPORT: this does not seem to be handled
  showICI?: boolean
}

interface ICodapV2PlottedFunctionAdornment extends ICodapV2Adornment {
  // TODO_V2_EXPORT: this key seems unnecessary because it is basically defining
  // the type of the adornment. The type of adornment is already determined from
  // the key in ICodapV2AdornmentMap. However the v2 code does use this key, and
  // it looks necessary to set it on export.
  adornmentKey?: string
  expression: string
}

interface ICodapV2PlottedValueAdornment extends ICodapV2Adornment {
  // TODO_V2_EXPORT: this key seems unnecessary because it is basically defining
  // the type of the adornment. The type of adornment is already determined from
  // the key in ICodapV2AdornmentMap. However the v2 code does use this key, and
  // it looks necessary to set it on export.
  adornmentKey?: string
  expression: string
}

interface ICodapV2AdornmentMap {
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

interface ICodapV2MovablePointStorage {
  isVisible: boolean
  enableMeasuresForSelection?: boolean
  coordinates: ICodapV2Coordinates
}

interface ICodapV2LineEquationCoords {
  proportionCenterX: number
  proportionCenterY: number
}

interface ICodapV2MovableLineStorage {
  isVisible: boolean
  enableMeasuresForSelection?: boolean
  isInterceptLocked: boolean
  // TODO_V2_IMPORT: equationCoords are not handled correctly, the import code assumes they have
  // an x and y instead of proportionCenterX and proportionCenterY
  // There are 2,000 instances of this in cfm-shared
  // example: cfm-shared/02RllCJzS0Nt4wX3c6XL/file.json
  equationCoords?: ICodapV2LineEquationCoords | null
  intercept: number
  slope: number
  isVertical: boolean
  xIntercept: number | null
}

interface ICodapV2LSRL {
  // TODO_V2_IMPORT: isVisible is not imported. Unknown how many files have it set to true
  isVisible: boolean
  enableMeasuresForSelection?: boolean
  // TODO_V2_IMPORT: isInterceptLocked is not imported. Unknown how many files have it set to true
  isInterceptLocked: boolean
  // TODO_V2_IMPORT: equationCoords are not handled correctly, the import code assumes they have
  // an x and y instead of proportionCenterX and proportionCenterY
  // There are 4,000 instances of this in cfm-shared
  // example: cfm-shared/00JG6PytJ4Zfhk3Yw4Xf/file.json
  equationCoords?: ICodapV2LineEquationCoords | null,
  // TODO_V2_IMPORT: showConfidenceBands is not imported. Unknown how many files have it set to true
  showConfidenceBands?: boolean
}

interface ICodapV2MultipleLSRLsStorage {
  isVisible: boolean
  enableMeasuresForSelection?: boolean
  // TODO_V2_IMPORT: showSumSquares is not imported
  // This is set to true in 900 files in cfm-shared
  showSumSquares?: boolean
  isInterceptLocked: boolean
  showConfidenceBands?: boolean
  lsrls?: ICodapV2LSRL[]
}

export interface ICodapV2PlotStorage {
  // TODO_V2_IMPORT: verticalAxisIsY2 is not imported
  // it is true 2,859 times in cfm-shared
  verticalAxisIsY2?: boolean
  adornments?: ICodapV2AdornmentMap
  areSquaresVisible?: boolean
  isLSRLVisible?: boolean
  // TODO_V2_IMPORT lsrLineStorage is not imported
  // it occurs 57 times in cfm-shared
  lsrLineStorage?: ICodapV2LSRL
  movableLineStorage?: ICodapV2MovableLineStorage
  movablePointStorage?: ICodapV2MovablePointStorage
  multipleLSRLsStorage?: ICodapV2MultipleLSRLsStorage
  showMeasureLabels?: boolean
  // TODO_V2_IMPORT breakdownType is not imported
  // it occurs 9,056 times in cfm-shared
  // 5,825 times its value is 0
  // 3,231 times its value is 1
  breakdownType?: number
  // TODO_V2_IMPORT plotModels[].width is not imported
  // unknown how many times it occurs in cfm-shared
  width?: number
  // TODO_V2_IMPORT alignment is not imported
  // it occurs 8,363 times in cfm-shared
  alignment?: number
  // TODO_V2_IMPORT dotsAreFused is not imported
  // it occurs 8,363 times in cfm-shared
  dotsAreFused?: boolean
  // TODO_V2_IMPORT totalNumberOfBins is not imported
  // it occurs 8,299 times in cfm-shared
  totalNumberOfBins?: number
  // expresssion at this level existed in a single file of 6,000 checked
  // in cfm-shared. It is unknown how many times it occurs in all of
  // of cfm-shared
  expression?: string
}

export interface ICodapV2PlotModel {
  plotClass: string
  plotModelStorage: ICodapV2PlotStorage
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
    // TODO_V2_IMPORT: hiddenCases is not imported
    // there are at least 12,064 instances at this level that are not
    // empty arrays in cfm-shared
    hiddenCases?: IGuidLink<"DG.Case">[]
    // TODO_V2_IMPORT: it doesn't seem like any of the *Coll fields are imported
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
  pointColor?: string
  strokeColor?: string
  pointSizeMultiplier?: number
  // TODO_V2_IMPORT: transparency is not imported
  transparency?: number
  // TODO_V2_IMPORT: strokeTransparency is not imported
  strokeTransparency?: number
  strokeSameAsFill?: boolean
  isTransparent?: boolean
  plotBackgroundColor?: string | null
  // TODO_V2_IMPORT: plotBackgroundOpacity is not imported
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

  // TODO_V2_IMPORT enableNumberToggle is not imported
  // There are 16,000 instances in cfm-shared
  enableNumberToggle?: boolean | null

  // TODO_V2_IMPORT numberToggleLastMode is not imported
  // There are 14,879 instances in cfm-shared
  // it must be optional based on the results for enableNumberToggle
  numberToggleLastMode?: boolean

  // See global `enableMeasuresForSelection` note
  // it is unknown how many times this property occurs in this location
  enableMeasuresForSelection?: boolean | null

  // TODO_V2_IMPORT: hiddenCases is not imported
  // there are at least 196 instances at this level that are empty arrays
  // there are at least 11 instances at this level with number values
  // Note: there are many more instances of this field inside of `_links_`
  // and the type of the array items is different.
  hiddenCases?: number[]
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

interface ICodapV2MapLayerBaseStorage {
  _links_: {
    context: IGuidLink<"DG.DataContextRecord">
    // TODO_V2_IMPORT hiddenCases are not imported
    // this array was passed right into MST where it is typed as a string array
    // There are 296 instances where this is a non-empty array in cfm-shared
    hiddenCases?: IGuidLink<"DG.Case">[],
    legendColl?: IGuidLink<"DG.Collection">,
    // We sometimes see an array of links here
    legendAttr?: IGuidLink<"DG.Attribute"> | IGuidLink<"DG.Attribute">[],
    // TODO_V2_IMPORT tHiddenCases
    // this occurs 523 times in cfm-shared
    // in all cases the value is `[]`
    tHiddenCases?: unknown[]
  }
  legendRole: number
  legendAttributeType: number
  isVisible: boolean
  strokeSameAsFill?: boolean
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
    // TODO_V2_IMPORT: as noted above enableMeasuresForSelection is not imported
    // There are 0 cases in cfm-shared where enableMeasuresForSelection is `true` in this
    // location
    enableMeasuresForSelection?: boolean
  }
  // TODO_V2_IMPORT: linesShouldBeVisible is not imported
  // It occurs 73 times within layerModels in cfm-shared
  // It is false in every case
  linesShouldBeVisible?: boolean
}
export function isV2MapPointLayerStorage(obj: unknown): obj is ICodapV2MapPointLayerStorage {
  return !!obj && typeof obj === "object" && "pointColor" in obj && obj.pointColor != null
}

export interface ICodapV2MapPolygonLayerStorage extends ICodapV2MapLayerBaseStorage {
  areaColor: string
  // TODO_V2_IMPORT: areaTransparency is not be imported
  areaTransparency: number | string // e.g. "0.5"
  areaStrokeColor: string
  // TODO_V2_IMPORT: areaStrokeTransparency is not imported
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
    // TODO_V2_IMPORT: gridMultiplier is not imported at this level
    // It appears 8,612 times in cfm-shared either here or
    // inside of the grid object
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

// TODO_V2_IMPORT GuideStorage is not imported
export interface ICodapV2GuideStorage extends ICodapV2BaseComponentStorage {
  currentItemIndex?: number | null
  isVisible?: boolean
  items: Array<{ itemTitle: string | null, url: string | null }>
  // This appears 997 times in cfm-shared
  currentURL?: string
  // This appears 997 times in cfm-shared
  currentItemTitle?: string | null
}

export interface ICodapV2TextStorage extends ICodapV2BaseComponentStorage {
  text?: string
  // v2's TextController.restoreComponentStorage references an `apiText` property,
  // but TextController.createComponentStorage doesn't write one out. ¯\_(ツ)_/¯
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
    // TODO_V2_IMPORT right is not imported
    // appears more than 20,000 in cfm-shared
    // this might not be optional
    right?: number | null
    // TODO_V2_IMPORT bottom is not imported
    // appears more than 20,000 in cfm-shared
    // this might not be optional
    bottom?: number | null
    // TODO_V2_IMPORT x is not imported
    // appears 5,258 times in cfm-shared
    // based on the results for `right`, this must be optional
    x?: number
    // TODO_V2_IMPORT y is not imported
    // appears 5,258 times in cfm-shared
    // based on the results for `right`, this must be optional
    y?: number

    // these *Orig properties only occur in a single file in cfm-shared
    leftOrig?: number
    topOrig?: number
    widthOrig?: number
    heightOrig?: number
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

// TODO_V2_IMPORT: handle importing case cards:
// https://www.pivotaltracker.com/story/show/188596023
export interface ICodapV2CaseCardComponent extends ICodapV2BaseComponent {
  type: "DG.CaseCard"
  componentStorage: ICodapV2CaseCardStorage
}

// TODO_V2_IMPORT: handle importing images
// This is used 3,971 times in cfm-shared
export interface ICodapV2ImageComponent extends ICodapV2BaseComponent {
  type: "DG.ImageComponentView"
  componentStorage: ICodapV2ImageStorage
}

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

// TODO_V2_IMPORT GuideView is not imported
// it occurs 16,371 times in cfm-shared
export interface ICodapV2GuideComponent extends ICodapV2BaseComponent {
  type: "DG.GuideView"
  componentStorage: ICodapV2GuideStorage
}
export const isV2GuideComponent = (component: ICodapV2BaseComponent): component is ICodapV2GuideComponent =>
              component.type === "DG.GuideView"

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
  ICodapV2GuideComponent |
  ICodapV2ImageComponent |
  ICodapV2MapComponent |
  ICodapV2SliderComponent |
  ICodapV2TableComponent |
  ICodapV2TextComponent |
  ICodapV2WebViewComponent
export type CodapV2ComponentStorage = CodapV2Component["componentStorage"]

export type CodapV2Context = ICodapV2DataContext | ICodapV2GameContext | ICodapV2ExternalContext
export const isV2ExternalContext = (context: CodapV2Context): context is ICodapV2ExternalContext =>
  !("type" in context) && ("externalDocumentId" in context)
export const isV2InternalContext = (context: CodapV2Context): context is ICodapV2DataContext | ICodapV2GameContext =>
  ("type" in context)


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

  // Ignored properties
  _permissions?: any
}

export function isCodapV2Document(content: unknown): content is ICodapV2DocumentJson {
  if (!content || typeof content !== "object") return false
  const hasV2AppName = "appName" in content && content.appName === "DG"
  const hasNoAppName = !("appName" in content) || !content.appName
  return ((hasV2AppName || hasNoAppName) &&
          "components" in content && Array.isArray(content.components) &&
          "contexts" in content && Array.isArray(content.contexts))
}
