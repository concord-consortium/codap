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
  attribute?: IAttribute | null
  attributeLocation?: IAttribute | null
  caseByID?: DICase
  caseByIndex?: DICase
  caseFormulaSearch?: DICase[]
  caseSearch?: DICase[]
  collection?: ICollectionModel | null
  component?: DIComponent
  dataContext?: IDataSet | null
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
  dimensions?: {
    height?: number
    width?: number
  }
  externalUndoAvailable?: boolean
  name?: string
  preventBringToFront?: boolean
  preventDataContextReorg?: boolean
  standaloneUndoModeAvailable?: boolean
  title?: string
  version?: string
}

export interface DIMetadata {
  dirtyDocument?: boolean
}

interface DISuccessResult {
  success: true
  values?: unknown
}

interface DIErrorResult {
  success: false
  values?: {
    error: string
  }
}

export type DIHandlerFnResult = DISuccessResult | DIErrorResult

export type DIHandlerFn = (resources: DIResources, values?: DIValues, metadata?: DIMetadata) => DIHandlerFnResult

export const diNotImplementedYetResult = {success: false, values: {error: "not implemented (yet)"}}
export const diNotImplementedYet: DIHandlerFn = () => diNotImplementedYetResult

interface DIBaseHandler {
  get?: DIHandlerFn
  create?: DIHandlerFn
  update?: DIHandlerFn
  delete?: DIHandlerFn
}

export type ActionName = "get" | "create" | "update" | "delete" | "notify" | "register" | "unregister"
export type DIHandler = RequireAtLeastOne<DIBaseHandler, "get" | "create" | "update" | "delete">

export type maybeString = string | null
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
