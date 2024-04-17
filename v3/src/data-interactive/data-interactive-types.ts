import { RequireAtLeastOne } from "type-fest"
import { IAttribute } from "../models/data/attribute"
import { ICodapV2Attribute, ICodapV2Collection, ICodapV2DataContext } from "../v2/codap-v2-types"
import { IDataSet } from "../models/data/data-set"
import { IGlobalValue } from "../models/global/global-value"
import { ITileModel } from "../models/tiles/tile-model"
import { ICollectionPropsModel } from "../models/data/collection"

export type DICaseValue = string | number | boolean | undefined
export type DICaseValues = Record<string, DICaseValue>
export interface DIFullCase {
  children?: string[],
  id?: string,
  parent?: string,
  values?: DICaseValues
}
export interface DIAllCases {
  cases?: {
    case?: DIFullCase,
    caseIndex?: number
  }[]
  collection?: {
    name?: string,
    id?: string
  }
}
export type DIAttribute = Partial<ICodapV2Attribute>
export interface DIAttributes {
  attrs?: DIAttribute[]
}
export interface DICase {
  collectionID?: string
  collectionName?: string
  caseID?: string
}
export type DICollection = Partial<ICodapV2Collection>
export type DIComponent  = unknown
export interface DIGlobal {
  name?: string
  value?: number
}
export type DIDataContext = Partial<ICodapV2DataContext>
export interface DIInteractiveFrame {
  dimensions?: {
    height?: number
    width?: number
  }
  externalUndoAvailable?: boolean
  id?: string | number
  name?: string
  preventBringToFront?: boolean
  preventDataContextReorg?: boolean
  savedState?: unknown
  standaloneUndoModeAvailable?: boolean
  title?: string
  version?: string
}
export type DIItem = unknown
export interface DINewCase {
  id?: string
  itemID?: string
}

export interface DIResources {
  attribute?: IAttribute
  attributeLocation?: IAttribute
  caseByID?: DICase
  caseByIndex?: DICase
  caseFormulaSearch?: DICase[]
  caseSearch?: DICase[]
  collection?: ICollectionPropsModel
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

export type DISingleValues = DIAllCases | DIAttribute | DIAttributes | DICase | DIDataContext |
  DIGlobal | DIInteractiveFrame | DINewCase

export type DIValues = DISingleValues | DISingleValues[] | number | string[]

export interface DIMetadata {
  dirtyDocument?: boolean
}

export interface DISuccessResult {
  success: true
  values?: DIValues
  caseIDs?: string[]
}

export interface DIErrorResult {
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

export type ActionName = keyof DIBaseHandler | "register" | "unregister"
export type DIHandler = RequireAtLeastOne<DIBaseHandler, "get" | "create" | "update" | "delete" | "notify">

export interface DIResourceSelector {
  attribute?: string
  attributeLocation?: string
  attributes?: string
  case?: string
  collection?: string
  component?: string
  dataContext?: string
  dataContextList?: string
  global?: string
  interactiveFrame?: string
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
