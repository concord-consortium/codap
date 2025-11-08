import { SetOptional } from "type-fest"
import { AttributeType } from "../models/data/attribute-types"
import { IV2CollectionDefaults } from "../models/shared/data-set-metadata"

type ColorString = string // e.g. "#ff5586" or "rgb(85,85,255)"
type ICodapV2CategoryOrder = { __order: string[] }

interface ICodapV2NumericAttributeColors {
  "attribute-color"?: string
  "low-attribute-color"?: string
  "high-attribute-color"?: string
}

interface ICodapV2CategoryColor {
  colorString: ColorString
}
interface ICodapV2HSBCategoryColor extends ICodapV2CategoryColor {
  h: number // hue
  s: number // saturation
  b: number // brightness
}
type CodapV2CategoryColor = ICodapV2HSBCategoryColor | ICodapV2CategoryColor | ColorString

export type CodapV2ColorMap = Record<string, CodapV2CategoryColor>

export type ICodapV2CategoryMap = CodapV2ColorMap & ICodapV2CategoryOrder & ICodapV2NumericAttributeColors

export function isV2CategoryMap(obj: unknown): obj is ICodapV2CategoryMap {
  return !!obj && typeof obj === "object" && "__order" in obj
}


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
  _categoryMap?: ICodapV2CategoryMap
  // legacy property; replaced by _categoryMap
  colormap?: CodapV2ColorMap
  // Ignored: defaults to true in v2 but never seems to be set to false
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
  decimals?: string
}

export const v3TypeFromV2TypeIndex: Array<AttributeType | undefined> = [
  // indices are numeric values of v2 types
  undefined, "numeric", "categorical", "date", "boundary", "color"
  // v2 type eNone === 0 which v3 codes as undefined
]

export function v3TypeFromV2TypeString(v2Type?: string | null): AttributeType | undefined {
  if (v2Type == null || v2Type === "none") return undefined
  if (v2Type === "nominal") return "categorical"
  if (v2Type === "number") return "numeric"
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
  // Deprecated in favor of `labels: singleCase`
  caseName?: string | null
  // TODO_V2_IMPORT_EXTRACT: childAttrName is not imported
  // There are 8,592 cases where this has a value in cfm-shared
  childAttrName?: string | null
  cid?: string
  // Ignored: seems to have no effect in v2 code
  collapseChildren?: boolean | null
  // TODO_V2_IMPORT_EXTRACT: defaults does not seem to be imported
  // There are 825 cases where it is defined in cfm-shared
  defaults?: IV2CollectionDefaults
  guid: number
  id?: number
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
  // Ignored: According to V2 documentation (and code) it is no longer used
  areParentChildLinksConfigured?: boolean
}

// when exporting a v3 collection to v2
type CollectionNotYetExported = "cases" | "caseName" | "childAttrName" | "collapseChildren"
export interface ICodapV2CollectionV3
  extends SetOptional<Omit<ICodapV2Collection, "attrs">, CollectionNotYetExported> {
  attrs: ICodapV2Attribute[]
}

export interface ICodapV2SetAsideItem {
  id: string // item id
  values: Record<string, number | string>
}

export const isV2SetAsideItem = (item: unknown): item is ICodapV2SetAsideItem =>
  !!(item && typeof item === "object" && "id" in item && "values" in item)

export interface ICodapV2ExternalContext {
  externalDocumentId: string
}

export interface ICodapV2DataContextMetadata {
  description?: string
  source?: string
  importDate?: string
  // Legacy (bug?) property imported as `importDate`
  "import date"?: string
}

export interface ICodapV2DataContext {
  type: "DG.DataContext" | "DG.GameContext"
  document?: number // id of containing document
  guid: number
  // Ignored: when present it is always redundant with guid
  id?: number
  // Imported in v3 as `attrConfigChanged`
  flexibleGroupingChangeFlag?: boolean | null
  name?: string
  title?: string
  collections: ICodapV2Collection[]
  // deprecated in favor of metadata.description
  description?: string
  metadata?: ICodapV2DataContextMetadata | null
  // Imported in v3 as `attrConfigProtected`
  preventReorg?: boolean
  // `setAsideItems` sometimes has other formats inside `momentsStorage`, i.e.
  // when saved by the story builder plugin, but that's an issue for the plugin.
  setAsideItems?: ICodapV2SetAsideItem[]
  contextStorage: ICodapV2DataContextStorage
  // Ignored: we are ignoring _permissions. It seems like a CFM artifact
  _permissions?: number
  v3?: {
    filterFormula?: string
  }
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
// NOTE: The plan is to reimplement Markov and other "legacy" data games plugins to use current API
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
export function isCodapV2GameContext(context?: CodapV2Context): context is ICodapV2GameContext {
  return !!context && "type" in context && context.type === "DG.GameContext"
}

export interface ICodapV2DataContextSelectedCase {
  type: "DG.Case"
  id: number
}

export interface ICodapV2DataContextStorage {
  _links_?: {
    selectedCases: ICodapV2DataContextSelectedCase[]
  }
}

export interface ICodapV2GameContextStorage extends ICodapV2DataContextStorage {
  gameName?: string | null
  gameUrl?: string | null
  gameState?: any
}

export type CodapV2InternalContext = ICodapV2DataContext | ICodapV2GameContext
export type CodapV2Context = CodapV2InternalContext | ICodapV2ExternalContext
export const isV2ExternalContext = (context: Maybe<CodapV2Context>): context is ICodapV2ExternalContext =>
  !!context && !("type" in context) && ("externalDocumentId" in context)
export const isV2InternalContext = (context: Maybe<CodapV2Context>): context is CodapV2InternalContext =>
  !!context && ("type" in context)
