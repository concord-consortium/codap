import { RequireAtLeastOne } from "type-fest"
import { IAttribute } from "../models/data/attribute"
import { ICodapV2Attribute, ICodapV2AttributeV3, ICodapV2Collection, ICodapV2DataContext } from "../v2/codap-v2-types"
import { IDataSet } from "../models/data/data-set"
import { ICase } from "../models/data/data-set-types"
import { IGlobalValue } from "../models/global/global-value"
import { ITileModel } from "../models/tiles/tile-model"
import { ICollectionPropsModel } from "../models/data/collection"
import { V2Component } from "./data-interactive-component-types"

export type DICaseValue = string | number | boolean | undefined
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
export type DIItem = DICaseValues
export interface DINewCase {
  id?: number
  itemID?: number
}
export interface DIUpdateCase {
  values: DICaseValues
}
export interface DINotification {
  request?: string
}

export interface DIResources {
  attribute?: IAttribute
  attributeList?: IAttribute[]
  attributeLocation?: IAttribute
  caseByID?: ICase
  caseByIndex?: ICase
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

// types for values accepted as inputs by the API
export type DISingleValues = DIAttribute | DICase | DIDataContext |
  DIGlobal | DIInteractiveFrame | DINewCase | DIUpdateCase | DINotification | V2Component
export type DIValues = DISingleValues | DISingleValues[] | number | string[]

// types returned as outputs by the API
export type DIResultAttributes = { attrs: ICodapV2AttributeV3[] }
export type DIResultSingleValues = DICase | DIComponentInfo | DIGlobal | DIInteractiveFrame
export type DIResultValues = DIResultSingleValues | DIResultSingleValues[] |
                              DIAllCases | DIResultAttributes | number

export interface DIMetadata {
  dirtyDocument?: boolean
}

export interface DISuccessResult {
  success: true
  values?: DIResultValues
  caseIDs?: number[]
  itemIDs?: string[]
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
  register?: DIHandlerFn
  unregister?: DIHandlerFn
}

export type ActionName = keyof DIBaseHandler | "register" | "unregister"
export type DIHandler =
  RequireAtLeastOne<DIBaseHandler, "get" | "create" | "update" | "delete" | "notify" | "register" | "unregister">

export interface DIResourceSelector {
  attribute?: string
  attributeLocation?: string
  attributes?: string
  case?: string
  caseByID?: string
  caseByIndex?: string
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
