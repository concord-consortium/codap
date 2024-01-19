export interface ICodapV2Attribute {
  guid: number
  id: number
  name: string
  type?: string | null
  title?: string
  cid?: string
  defaultMin?: number
  defaultMax?: number
  description: string
  categoryMap?: any
  _categoryMap?: any
  colormap?: any
  _colormap?: any
  blockDisplayOfEmptyCategories?: boolean
  editable: boolean
  renameable?: boolean
  deleteable?: boolean
  formula: string
  deletedFormula?: string
  precision: number
  unit?: string | null
}

export function isCodapV2Attribute(o: any): o is ICodapV2Attribute {
  return o.type === "DG.Attribute"
}

export interface ICodapV2Case {
  id?: number
  guid: number
  itemID?: number
  parent?: number
  values: Record<string, number | string>
}

export interface ICodapV2Collection {
  attrs: ICodapV2Attribute[]
  cases: ICodapV2Case[]
  caseName: string | null
  childAttrName: string | null,
  collapseChildren: boolean | null,
  defaults?: {
    xAttr: string
    yAttr: string
  }
  guid: number
  id?: number
  labels?: {
    singleCase: string
    pluralCase: string
    singleCaseWithArticle: string
    setOfCases: string
    setOfCasesWithArticle: string
  }
  name: string
  parent?: number
  title: string
  type: "DG.Collection"
}

export interface ICodapV2DataContext {
  type: "DG.DataContext"
  document?: number // id of containing document
  guid: number
  id: number
  flexibleGroupingChangeFlag: boolean
  name: string
  title: string
  collections: ICodapV2Collection[]
  description?: string
  // metadata: this.metadata,
  // preventReorg: boolean
  // setAsideItems: this.get('dataSet').archiveSetAsideItems(),
  // contextStorage: this.contextStorage
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
  userSetTitle: boolean
  cannotClose: boolean
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
  animationDirection: number
  animationMode: number
  restrictToMultiplesOf: number | null
  maxPerSecond: number | null
  userTitle: boolean
}

export interface ICodapV2TableStorage extends ICodapV2BaseComponentStorage {
  _links_: {
    context: IGuidLink<"DG.DataContextRecord">
  }
  attributeWidths: Array<{
    _links_: {
      attr: IGuidLink<"DG.Attribute">
    }
    width: number
  }>
  title: string
}

interface ICodapV2Coordinates {
  x: number
  y: number
}

interface ICodapV2ProportionCoordinates {
  proportionX: number
  proportionY: number
}

interface ICodapV2ValueModel {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  values: Record<string, number>
}

interface ICodapV2CountAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  isShowingCount: boolean
  isShowingPercent: boolean
  percentKind: number
}

interface ICodapV2ConectingLinesAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
}

interface ICodapV2MovableValueAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  isShowingCount: boolean
  isShowingPercent: boolean
  valueModels: ICodapV2ValueModel[]
}

interface ICodapV2MeanAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  equationCoordsArray: ICodapV2ProportionCoordinates[]
}

interface ICodapV2MedianAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  equationCoordsArray: ICodapV2ProportionCoordinates[]
}

interface ICodapV2StDevAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  equationCoordsArray: ICodapV2ProportionCoordinates[]
}

interface ICodapV2MadAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  equationCoordsArray: ICodapV2ProportionCoordinates[]
}

interface ICodapV2BoxPlotAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  equationCoordsArray: ICodapV2ProportionCoordinates[]
  showOutliers: boolean
  showICI: boolean
}

interface ICodapV2PlottedFunctionAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  adornmentKey: string
  expression: string
}

interface ICodapV2PlottedValueAdornment {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  adornmentKey: string
  expression: string
}

type ICodapV2Adornment = ICodapV2CountAdornment | ICodapV2ConectingLinesAdornment | ICodapV2MovableValueAdornment |
                         ICodapV2MeanAdornment | ICodapV2MedianAdornment | ICodapV2StDevAdornment |
                         ICodapV2MadAdornment | ICodapV2PlottedFunctionAdornment | ICodapV2PlottedValueAdornment |
                         ICodapV2BoxPlotAdornment

interface ICodapV2MovablePointStorage {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  coordinates: ICodapV2Coordinates
}

interface ICodapV2MovableLineStorage {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  isInterceptLocked: boolean
  equationCoords: ICodapV2Coordinates | null
  intercept: number
  slope: number
  isVertical: boolean
  xIntercept: number
}

interface ICodapV2LSRL {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  isInterceptLocked: boolean
  equationCoords: ICodapV2Coordinates | null,
  showConfidenceBands: boolean
}

interface ICodapV2MultipleLSRLsStorage {
  isVisible: boolean
  enableMeasuresForSelection: boolean
  showSumSquares: boolean
  isInterceptLocked: boolean
  showConfidenceBands: boolean
  lsrls: ICodapV2LSRL[]
}

export interface ICodapV2PlotStorage {
  verticalAxisIsY2: boolean
  adornments: ICodapV2Adornment
  areSquaresVisible: boolean
  isLSRLVisible: boolean
  movableLineStorage: ICodapV2MovableLineStorage
  movablePointStorage: ICodapV2MovablePointStorage
  multipleLSRLsStorage: ICodapV2MultipleLSRLsStorage
  showMeasureLabels: boolean
}

export interface ICodapV2PlotModel {
  plotClass: string
  plotModelStorage: ICodapV2PlotStorage
}

export interface ICodapV2GraphStorage extends ICodapV2BaseComponentStorage {
  _links_: {
    context: IGuidLink<"DG.DataContextRecord">
    hiddenCases: any[]
    xColl: IGuidLink<"DG.Collection">
    xAttr: IGuidLink<"DG.Attribute">
    yColl: IGuidLink<"DG.Collection">
    yAttr: IGuidLink<"DG.Attribute"> | Array<IGuidLink<"DG.Attribute">>
    y2Coll: IGuidLink<"DG.Collection">
    y2Attr: IGuidLink<"DG.Attribute">
    rightColl: IGuidLink<"DG.Collection">
    rightAttr: IGuidLink<"DG.Attribute">
  }
  displayOnlySelected: boolean
  legendRole: number
  legendAttributeType: number
  pointColor: string
  strokeColor: string
  pointSizeMultiplier: 1
  transparency: number
  strokeTransparency: number
  strokeSameAsFill: boolean
  isTransparent: boolean
  plotBackgroundColor: string | null
  plotBackgroundOpacity: number
  plotBackgroundImageLockInfo: any
  xRole: number
  xAttributeType: number
  yRole: number
  yAttributeType: number
  y2Role: number
  y2AttributeType: number
  topRole: number
  topAttributeType: number
  rightRole: number
  rightAttributeType: number
  xAxisClass: string
  xLowerBound?: number
  xUpperBound?: number
  yAxisClass: string
  yLowerBound?: number
  yUpperBound?: number
  y2AxisClass: string
  y2LowerBound?: number
  y2UpperBound?: number
  topAxisClass: string
  rightAxisClass: string
  plotModels: ICodapV2PlotModel[]
}

export interface ICodapV2GuideStorage extends ICodapV2BaseComponentStorage {
  currentItemIndex?: number
  isVisible?: boolean
  items: Array<{ itemTitle: string, url: string }>
}

export interface ICodapV2BaseComponent {
  type: string  // e.g. "DG.TableView", "DG.GraphView", "DG.GuideView", etc.
  guid: number
  id: number
  componentStorage: Record<string, any>
  layout: {
    width: number
    height: number
    left: number
    top: number
    isVisible: boolean
    zIndex?: number
  }
  savedHeight: number | null
}

export interface ICodapV2CalculatorComponent extends ICodapV2BaseComponent {
  type: "DG.Calculator"
  componentStorage: ICodapV2CalculatorStorage
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

export interface ICodapV2GraphComponent extends ICodapV2BaseComponent {
  type: "DG.GraphView"
  componentStorage: ICodapV2GraphStorage
}
export const isV2GraphComponent = (component: ICodapV2BaseComponent): component is ICodapV2GraphComponent =>
              component.type === "DG.GraphView"

export interface ICodapV2GuideComponent extends ICodapV2BaseComponent {
  type: "DG.GuideView"
  componentStorage: ICodapV2GuideStorage
}
export const isV2GuideComponent = (component: ICodapV2BaseComponent): component is ICodapV2GuideComponent =>
              component.type === "DG.GuideView"

export type CodapV2Component = ICodapV2GraphComponent | ICodapV2GuideComponent | ICodapV2TableComponent

export interface ICodapV2DocumentJson {
  type?: string         // "DG.Document"
  id?: number
  guid: number
  name: string
  appName: string       // "DG"
  appVersion: string
  appBuildNum: string
  // these three are maintained as maps internally but serialized as arrays
  components: CodapV2Component[]
  contexts: ICodapV2DataContext[]
  globalValues: ICodapV2GlobalValue[]
  lang?: string
  idCount?: number
}