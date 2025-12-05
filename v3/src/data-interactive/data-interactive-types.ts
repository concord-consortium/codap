import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { RequireAtLeastOne } from "type-fest"
import { LoggableValue } from "../lib/log-message"
import { ICodapV2DocumentJson } from "../v2/codap-v2-types"
import { IAdornmentModel } from "../components/graph/adornments/adornment-models"
import { IAttribute } from "../models/data/attribute"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICase, ICaseID } from "../models/data/data-set-types"
import { IGlobalValue } from "../models/global/global-value"
import { ITileModel } from "../models/tiles/tile-model"
import { V2SpecificComponent } from "./data-interactive-component-types"
import {
  DIAllCases, DIAttribute, DIAttributeLocationValues, DICase, DICreateAdornment, DICreateCollection,
  DIDataContext, DIDeleteAdornment, DIDeleteCollectionResult, DIGetCaseResult, DIItemValues, DINewCase,
  DINotifyAttribute, DINotifyDataContext, DIResultAttributes, DIUpdateAdornment, DIUpdateCase, DIUpdateItemResult
} from "./data-interactive-data-set-types"
import { DIAdornmentValues } from "./data-interactive-adornment-types"

export type DIDocument = ICodapV2DocumentJson

export type DIComponent = ITileModel
export interface DIComponentInfo {
  hidden?: boolean
  id?: number
  name?: string
  title?: string
  type?: string
}

interface DIFunctionArg {
  name: string
  type: string
  description: string
  required: boolean
}
interface DIFunction {
  name: string
  displayName: string
  category: string
  description: string
  minArgs: number
  maxArgs: number
  args: DIFunctionArg[]
  examples: string[]
}
export type DIFunctionCategory = Record<string, DIFunction>
export type DIFunctionCategories = Record<string, DIFunctionCategory>

export interface DIGlobal {
  name?: string
  value?: number
}

export interface DIInteractiveFrame {
  allowEmptyAttributeDeletion?: boolean
  blockAPIRequestsWhileEditing?: boolean
  cannotClose?: boolean
  codapVersion?: string
  dimensions?: {
    height?: number
    width?: number
  }
  externalUndoAvailable?: boolean
  id?: string | number
  name?: string
  preventAttributeDeletion?: boolean
  preventBringToFront?: boolean
  preventDataContextReorg?: boolean
  preventTopLevelReorg?: boolean
  respectEditableItemAttribute?: boolean
  savedState?: unknown
  standaloneUndoModeAvailable?: boolean
  subscribeToDocuments?: boolean
  title?: string
  version?: string
}

export interface DINotification {
  request?: string
}
export interface DIItemSearchNotify {
  itemOrder?: "first" | "last" | number[]
}

export interface DILogMessage {
  formatStr?: string
  replaceArgs?: LoggableValue | LoggableValue[]
}

export interface DIUrl {
  URL: string
}
export interface DIDataDisplay {
  exportDataUri?: string
}

export interface DIInteractiveApi {
  initInteractive?: object
}

export interface DIResources {
  adornment?: IAdornmentModel
  adornmentList?: IAdornmentModel[]
  attribute?: IAttribute
  attributeList?: IAttribute[]
  attributeLocation?: IAttribute
  caseByID?: ICase
  caseByIndex?: ICase
  caseFormulaSearch?: ICase[]
  caseSearch?: ICase[]
  collection?: ICollectionModel
  collectionList?: ICollectionModel[]
  component?: DIComponent
  dataContext?: IDataSet
  dataContextList?: IDataSet[]
  dataDisplay?: DIDataDisplay
  document?: DIDocument
  error?: string
  global?: IGlobalValue
  interactiveFrame?: ITileModel
  isDefaultDataContext?: boolean
  item?: ICase
  itemByCaseID?: ICase
  itemByID?: ICase
  itemCount?: number
  itemSearch?: ICaseID[]
  cfm?: CloudFileManager
}

// types for values accepted as inputs by the API
export type DISingleValues = DIAttribute | DINotifyAttribute | DIAttributeLocationValues | DICase | DIDataContext |
  DIDocument | DINotifyDataContext | DIGlobal | DIInteractiveFrame | DIItemValues | DICreateCollection | DINewCase |
  DIUpdateCase | DINotification | DIItemSearchNotify | DILogMessage | DIUrl | V2SpecificComponent | DIAdornmentValues
export type DIValues = DISingleValues | DISingleValues[] | number | string[]

// types returned as outputs by the API
export type DIResultSingleValues = DICase | DIComponentInfo |  DIDataDisplay | DIDocument | DIFunctionCategories |
  DIGetCaseResult | DIGlobal | DIInteractiveApi | DIInteractiveFrame

export type DIResultValues = DIResultSingleValues | DIResultSingleValues[] |
  DIAllCases | DIDeleteCollectionResult | DIUpdateItemResult | DIResultAttributes | number | number[] |
  DICreateAdornment | DIDeleteAdornment | DIUpdateAdornment | number | number[]

export interface DIMetadata {
  dirtyDocument?: boolean
}

export interface DISuccessResult {
  success: true
  values?: DIResultValues
  caseIDs?: number[]
  itemIDs?: number[]
}

export interface DIErrorResult {
  success: false
  values?: {
    error: string
  }
}

export type DIHandlerFnResult = DISuccessResult | DIErrorResult

export function isErrorResult(result: unknown): result is DIErrorResult {
  return result != null && typeof result === "object" && "success" in result && !result.success
}

export type DIHandlerFn = (resources: DIResources, values?: DIValues, metadata?: DIMetadata) => DIHandlerFnResult
export type DIHandlerAsyncFn = (...args: Parameters<DIHandlerFn>) => DIHandlerFnResult | Promise<DIHandlerFnResult>

export const diNotImplementedYetResult = {success: false, values: {error: "not implemented (yet)"}} as const
export const diNotImplementedYet: DIHandlerFn = () => diNotImplementedYetResult

// This approach of defining both a synchronous and asynchronous handler makes it easier
// for simple synchronous handlers to write tests. They don't need to await every call
// when we know the calls are synchronous.
interface DIBaseHandler {
  get?: DIHandlerFn
  create?: DIHandlerFn
  update?: DIHandlerFn
  delete?: DIHandlerFn
  notify?: DIHandlerFn
  register?: DIHandlerFn
  unregister?: DIHandlerFn
}

export type ActionName = keyof DIBaseHandler
export type DIHandler = RequireAtLeastOne<DIBaseHandler, ActionName>

interface DIBaseAsyncHandler {
  get?: DIHandlerAsyncFn
  create?: DIHandlerAsyncFn
  update?: DIHandlerAsyncFn
  delete?: DIHandlerAsyncFn
  notify?: DIHandlerAsyncFn
  register?: DIHandlerAsyncFn
  unregister?: DIHandlerAsyncFn
}
export type DIAsyncHandler = RequireAtLeastOne<DIBaseAsyncHandler, ActionName>

export interface DIResourceSelector {
  attribute?: string
  attributeLocation?: string
  attributes?: string
  case?: string
  caseByID?: string
  caseByIndex?: string
  caseFormulaSearch?: string
  caseSearch?: string
  collection?: string
  component?: string
  dataContext?: string
  dataContextList?: string
  dataDisplay?: string
  global?: string
  interactiveFrame?: string
  item?: string
  itemByCaseID?: string
  itemByID?: string
  itemSearch?: string
  logMessage?: string
  interactiveApi?: string
  type?: string
}

export interface DIAction {
  action: ActionName
  resource: string
  values?: DIValues
}
export type DIRequest = DIAction | DIAction[]
export type DIRequestResponse = DIHandlerFnResult | DIHandlerFnResult[]
export type DIRequestCallback = (response: DIRequestResponse) => void

export type DIQueryValue = number | string | boolean
export type DIQueryFunction = (a?: DIQueryValue, b?: DIQueryValue) => boolean
export interface DIParsedOperand {
  attr?: IAttribute
  name: string
  value: DIQueryValue
}
export interface DIParsedQuery {
  valid: boolean
  func: DIQueryFunction
  left?: DIParsedOperand
  right?: DIParsedOperand
}
