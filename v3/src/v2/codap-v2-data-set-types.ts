import { SetOptional } from "type-fest"
import { AttributeType } from "../models/data/attribute-types"

type ColorString = string // e.g. "#ff5586" or "rgb(85,85,255)"
type ICodapV2CategoryOrder = { __order: string[] }

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

export type ICodapV2CategoryMap = CodapV2ColorMap & ICodapV2CategoryOrder

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
  // TODO_V2_IMPORT_EXPORT
  _categoryMap?: ICodapV2CategoryMap
  // legacy property; replaced by _categoryMap
  colormap?: CodapV2ColorMap
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
  // TODO_V2_IMPORT_EXTRACT: caseName is not imported
  // There are 2,500 cases where this has a value in cfm-shared
  caseName?: string | null
  // TODO_V2_IMPORT_EXTRACT: childAttrName is not imported
  // There are 8,592 cases where this has a value in cfm-shared
  childAttrName?: string | null
  cid?: string
  // TODO_V2_IMPORT_EXTRACT: collapseChildren is not imported
  // There are 250 cases where this is true in cfm-shared
  collapseChildren?: boolean | null
  // TODO_V2_IMPORT_EXTRACT: defaults does not seem to be imported
  // There are 825 cases where it is defined in cfm-shared
  defaults?: {
    xAttr?: string
    yAttr?: string
  }
  guid: number
  id?: number
  // TODO_V2_IMPORT_CARRY_OVER: labels seem to be handled by the plugin api, and stored in v3 structures but
  // they don't seem to be imported when opening a v2 document
  // There is a V3 interface for this — CollectionLabels
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
  // TODO_V2_IMPORT_IGNORE areParentChildLinksConfigured is not imported
  // it is true 5,000 times in 2,812 files in cfm-shared
  // it is false at least 20,000 times
  // According to V2 documentation it is no longer used
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
  // TODO_V2_IMPORT_CARRY_OVER data context metadata source is not imported
  // unknown how many instances in this location
  // In V3 this is stored as sourceName in dataset
  source?: string
  // TODO_V2_IMPORT_CARRY_OVER G data context metadata importDate is not imported
  // at least 20,000 instances in cfm-shared
  importDate?: string
  // TODO_V2_IMPORT_EXTRACT "import date" is not imported
  // 2,025 instances in cfm-shared
  // Assume that it is the same as importDate and convert
  "import date"?: string
}

export interface ICodapV2DataContext {
  type: "DG.DataContext"
  document?: number // id of containing document
  guid: number
  // TODO_V2_IMPORT_STORE do we need to import id so we can export it again?
  // It is not always present in v2 files.
  id?: number
  // TODO_V2_IMPORT_DEFINE_AND_IMPLEMENT flexibleGroupingChangeFlag is not imported
  // This is set to true in 11,000 cfm-shared files
  // This flag is used in interaction with plugin to indicate that the user
  //   has moved an attribute in a way that invalidates the plugin's assumptions.
  // V3 should define and implement, following the pattern set in V2
  flexibleGroupingChangeFlag?: boolean | null
  name?: string
  title?: string
  collections: ICodapV2Collection[]
  // deprecated in favor of metadata.description
  description?: string
  metadata?: ICodapV2DataContextMetadata | null
  // TODO_V2_IMPORT_DEFINE_AND_IMPLEMENT preventReorg is not imported
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
  // TODO_V2_IMPORT_IGNORE we are ignoring _permissions. It seems like a CFM
  // artifact
  _permissions?: number
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

export interface ICodapV2DataContextSelectedCase {
  type: string
  id: number
}

export interface ICodapV2DataContextStorage {
  _links_?: {
    // TODO_V2_IMPORT_EXTRACT selectedCases is not imported
    // they appear at lest 20,000 times perhaps both in game context and data context
    // The value is an empty array 11,300 times
    // Note that V3 should be storing selection in V3 documents as well
    selectedCases: ICodapV2DataContextSelectedCase[]
  }
}

export interface ICodapV2GameContextStorage extends ICodapV2DataContextStorage {
  gameName?: string | null
  gameUrl?: string | null
  gameState?: any
}

export type CodapV2Context = ICodapV2DataContext | ICodapV2GameContext | ICodapV2ExternalContext
export const isV2ExternalContext = (context: CodapV2Context): context is ICodapV2ExternalContext =>
  !("type" in context) && ("externalDocumentId" in context)
export const isV2InternalContext = (context: CodapV2Context): context is ICodapV2DataContext | ICodapV2GameContext =>
  ("type" in context)
