import { RequireAtLeastOne } from "type-fest"
import { LoggableValue } from "../lib/log-message"
import { IAttribute } from "../models/data/attribute"
import { IValueType } from "../models/data/attribute-types"
import { ICollectionLabels, ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICase, ICaseID } from "../models/data/data-set-types"
import { IGlobalValue } from "../models/global/global-value"
import { ITileModel } from "../models/tiles/tile-model"
import { ICodapV2Attribute, ICodapV2Collection, ICodapV2DataContext } from "../v2/codap-v2-types"
import { V2SpecificComponent } from "./data-interactive-component-types"

export type DICaseValue = IValueType
export type DICaseValues = Record<string, DICaseValue>
export interface DIFullCase {
  children?: number[]
  context?: {
    id?: number
    name?: string
  }
  collection?: {
    id?: number
    name?: string
    parent?: {
      id?: number
      name?: string
    }
  }
  id?: number
  itemId?: number
  parent?: number
  values?: DICaseValues
}
export interface DIAllCases {
  cases?: {
    case?: DIFullCase
    caseIndex?: number
  }[]
  collection?: {
    name?: string
    id?: number
  }
}
export type DIAttribute = Partial<ICodapV2Attribute>
export interface DINotifyAttribute {
  mouseX?: number
  mouseY?: number
  overlayHeight?: number
  overlayWidth?: number
  request?: string
}
export interface DIAttributeLocationValues {
  collection?: string | number
  position?: number
}
export interface DICase {
  collectionID?: number
  collectionName?: string
  caseID?: number
  itemID?: number
}
export type DICollection = Partial<ICodapV2Collection>
export type DIComponent = ITileModel
export interface DIComponentInfo {
  hidden?: boolean
  id?: number
  name?: string
  title?: string
  type?: string
}
export interface DIGlobal {
  name?: string
  value?: number
}
export type DIDataContext = Partial<ICodapV2DataContext>
export interface DINotifyDataContext {
  operation?: string
  request?: string
  caseIDs?: number[]
}
export interface DIGetCaseResult {
  case: {
    id?: number
    parent?: number
    collection?: {
      id?: number
      name?: string
    }
    values?: DICaseValues
    children?: number[]
  }
  caseIndex?: number
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
  title?: string
  version?: string
}
export type DIItem = DICaseValues
export type DIItemValues = DIItem | { id?: string | number, values: DIItem }
type DICollectionLabels = Partial<ICollectionLabels>
export interface DICreateCollection {
  labels?: DICollectionLabels
  name?: string
  title?: string
  parent?: string
  attributes?: DIAttribute[]
  attrs?: DIAttribute[]
}
export interface DINewCase {
  id?: number
  itemID?: number
}
export interface DIUpdateCase {
  values: DICaseValues
}
export interface DIDeleteCollectionResult {
  collections?: number[]
}
export interface DIUpdateCollection {
  title?: string
  labels?: DICollectionLabels
}
export interface DIUpdateItemResult {
  changedCases?: number[]
  createdCases?: number[]
  deletedCases?: number[]
}
export interface DIUpdateDataContext extends DIDataContext {
  managingController?: string
  sort?: {
    attr?: string
    isDescending?: boolean
  }
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

export interface DIResources {
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
  error?: string
  global?: IGlobalValue
  imageSnapshot?: DIComponent
  interactiveFrame?: ITileModel
  isDefaultDataContext?: boolean
  item?: ICase
  itemByCaseID?: ICase
  itemByID?: ICase
  itemCount?: number
  itemSearch?: ICaseID[]
}

// types for values accepted as inputs by the API
export type DISingleValues = DIAttribute | DINotifyAttribute | DIAttributeLocationValues | DICase | DIDataContext |
  DINotifyDataContext | DIGlobal | DIInteractiveFrame | DIItemValues | DICreateCollection | DINewCase | DIUpdateCase |
  DINotification | DIItemSearchNotify | DILogMessage | DIUrl | V2SpecificComponent
export type DIValues = DISingleValues | DISingleValues[] | number | string[]

// types returned as outputs by the API
export type DIResultAttributes = { attrs: ICodapV2Attribute[] }
export type DIResultSingleValues = DICase | DIComponentInfo |  DIDataDisplay | DIGetCaseResult | DIGlobal
  | DIInteractiveFrame
  
export type DIResultValues = DIResultSingleValues | DIResultSingleValues[] |
  DIAllCases | DIDeleteCollectionResult | DIUpdateItemResult | DIResultAttributes | number | number[]

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
