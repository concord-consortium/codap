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
  type: 'DG.Collection'
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

}

export interface IGuidLink<T extends string> {
  type: T
  id: number
}

export interface ICodapV2TableStorage {
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

export interface ICodapV2PlotModel {
  plotClass: string
  plotModelStorage: any
}

export interface ICodapV2GraphStorage {
  _links_: {
    context: IGuidLink<"DG.DataContextRecord">
    hiddenCases: any[]
    xColl: IGuidLink<"DG.Collection">
    xAttr: IGuidLink<"DG.Attribute">
    yColl: IGuidLink<"DG.Collection">
    yAttr: IGuidLink<"DG.Attribute">
  }
  legendRole: number
  legendAttributeType: number
  pointColor: string
  strokeColor: string
  pointSizeMultiplier: 1
  transparency: number
  strokeTransparency: number
  isTransparent: boolean
  xRole: number
  xAttributeType: number
  yRole: number
  yAttributeType: number
  y2Role: number
  y2AttributeType: number
  xAxisClass: string
  yAxisClass: string
  y2AxisClass: string
  plotModels: ICodapV2PlotModel[]
  title: string
}

export interface ICodapV2GuideStorage {
  currentItemIndex?: number
  isVisible?: boolean
  title?: string
  items: Array<{ itemTitle: string, url: string }>
}

export interface ICodapV2BaseComponent {
  type: string  // e.g. "DG.TableView", "DG.GraphView", "DG.GuideView", etc.
  guid: number
  componentStorage: Record<string, any>
  layout: {
    width: number
    height: number
    left: number
    top: number
    isVisible: boolean
  }
  savedHeight: number | null
}

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
