import { RequireAtLeastOne } from "type-fest"
import { IAttribute } from "../models/data/attribute"
import { IDataSet } from "../models/data/data-set"
import { IGlobalValue } from "../models/global/global-value"
import { ITileModel } from "../models/tiles/tile-model"
import { ICollectionModel } from "../models/data/collection"

export type DICase = unknown
export type DIComponent  = unknown
export type DIItem = unknown

export interface DIResources {
  attribute?: IAttribute
  attributeLocation?: IAttribute
  caseByID?: DICase
  caseByIndex?: DICase
  caseFormulaSearch?: DICase[]
  caseSearch?: DICase[]
  collection?: ICollectionModel
  component?: DIComponent
  dataContext?: IDataSet
  dataContextList?: IDataSet[]
  global?: IGlobalValue
  interactiveFrame?: ITileModel
  isDefaultDataContext?: boolean
  item?: DIItem
  itemByCaseID?: DIItem
  itemByID?: DIItem
  itemCount?: number
  itemSearch?: DIItem[]
}

export interface DIValues {
  blockDisplayOfEmptyCategories?: boolean
  _categoryMap?: unknown
  cid?: string
  defaultMax?: number
  defaultMin?: number
  deleteable?: boolean
  deletedFormula?: string
  description?: string
  dimensions?: {
    height?: number
    width?: number
  }
  editable?: boolean
  externalUndoAvailable?: boolean
  formula?: string
  guid?: string
  hidden?: boolean
  name?: string
  precision?: number
  preventBringToFront?: boolean
  preventDataContextReorg?: boolean
  renameable?: boolean
  standaloneUndoModeAvailable?: boolean
  title?: string
  type?: string
  unit?: string
  version?: string
}

export interface DIMetadata {
  dirtyDocument?: boolean
}

interface DISuccessResult {
  success: true
  values?: DIValues
}

interface DIErrorResult {
  success: false
  values?: {
    error: string
  }
}

export type DIHandlerFnResult = DISuccessResult | DIErrorResult

export type DIHandlerFn = (resources: DIResources, values?: DIValues, metadata?: DIMetadata) => DIHandlerFnResult

export const diNotImplementedYetResult = {success: false, values: {error: "not implemented (yet)"}} as const
export const diNotImplementedYet: DIHandlerFn = () => diNotImplementedYetResult

interface DIBaseHandler {
  get?: DIHandlerFn
  create?: DIHandlerFn
  update?: DIHandlerFn
  delete?: DIHandlerFn
  notify?: DIHandlerFn
}

export type ActionName = "get" | "create" | "update" | "delete" | "notify" | "register" | "unregister"
export type DIHandler = RequireAtLeastOne<DIBaseHandler, "get" | "create" | "update" | "delete" | "notify">

export type maybeString = string
export interface DIResourceSelector {
  attribute?: maybeString
  attributeLocation?: maybeString
  attributes?: maybeString
  case?: maybeString
  collection?: maybeString
  component?: maybeString
  dataContext?: maybeString
  dataContextList?: maybeString
  global?: maybeString
  interactiveFrame?: maybeString
  logMessage?: maybeString
  type?: maybeString
}

export interface DIAction {
  action: ActionName
  resource: string
  values?: DIValues
}
export type DIRequest = DIAction | DIAction[]
export type DIRequestResponse = DIHandlerFnResult | DIHandlerFnResult[]
