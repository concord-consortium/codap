import { IAdornmentModelSnapshot } from "../components/graph/adornments/adornment-models"
import { IValueType } from "../models/data/attribute-types"
import { ICollectionLabelsSnapshot } from "../models/shared/data-set-metadata"
import { ICodapV2Attribute, ICodapV2Collection, ICodapV2DataContext } from "../v2/codap-v2-data-context-types"

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
export interface DIAttribute extends Partial<ICodapV2Attribute> {
  // v3 addition: whether the attribute is protected from deletion
  deleteProtected?: boolean
  // v3 addition: whether the attribute is protected from renaming
  renameProtected?: boolean
}
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
export type DIDataContext = Partial<ICodapV2DataContext>
export interface DINotifyDataContext {
  operation?: string
  request?: string
  caseIDs?: number[]
}

export type DIItem = DICaseValues
export type DIItemValues = DIItem | { id?: string | number; values: DIItem}
type DICollectionLabels = Partial<ICollectionLabelsSnapshot>
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
export interface DIUpdateCollection {
  title?: string
  labels?: DICollectionLabels
}
export interface DIUpdateDataContext extends DIDataContext {
  managingController?: string
  sort?: {
    attr?: string
    isDescending?: boolean
  }
  rerandomize?: boolean
}

// types returned as outputs by the API

export type DIResultAttributes = { attrs: ICodapV2Attribute[]}

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
export interface DIUpdateItemResult {
  changedCases?: number[]
  createdCases?: number[]
  deletedCases?: number[]
}
export interface DIDeleteCollectionResult {
  collections?: number[]
}
export interface DICreateAdornment {
  adornment: IAdornmentModelSnapshot
}
export interface DIDeleteAdornment {
  type: string
}
export interface DIUpdateAdornment {
  adornment: IAdornmentModelSnapshot
}
