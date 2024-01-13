import { RequireAtLeastOne } from "type-fest"
import { IAttribute } from "../models/data/attribute"
import { IDataSet } from "../models/data/data-set"
import { IGlobalValue } from "../models/global/global-value"

export type DICase = unknown
export type DICollection = unknown
export type DIComponent  = unknown
export type DIItem = unknown

export interface DIResources {
  attribute?: IAttribute
  caseByID?: DICase
  caseByIndex?: DICase
  caseFormulaSearch?: DICase[]
  caseSearch?: DICase[]
  collection?: DICollection
  component?: DIComponent
  dataContext?: IDataSet
  dataContextList?: IDataSet[]
  global?: IGlobalValue
  interactiveFrame?: any
  isDefaultDataContext?: boolean
  item?: DIItem
  itemByCaseID?: DIItem
  itemByID?: DIItem
  itemCount?: number
  itemSearch?: DIItem[]
}

export type DIValues = unknown

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

export type DIHandler = RequireAtLeastOne<DIBaseHandler, "get" | "create" | "update" | "delete">
