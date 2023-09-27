import { AdornmentModel } from "./adornment-models"
import { PlotType } from "../graphing-types"
import { ParentAdornmentType } from "./adornment-types"

export interface IAdornmentContentInfo {
  modelClass: typeof AdornmentModel
  plots: PlotType[]
  prefix: string
  parentType?: ParentAdornmentType
  type: string
}

const gAdornmentContentInfoMap: Record<string, IAdornmentContentInfo> = {}

export function registerAdornmentContentInfo(info: IAdornmentContentInfo) {
  gAdornmentContentInfoMap[info.type] = info
}

export function getAdornmentContentInfo(type: string) {
  return gAdornmentContentInfoMap[type]
}

export function getAdornmentContentModels() {
  return Object.values(gAdornmentContentInfoMap).map(info => info.modelClass)
}

export function getAdornmentTypes() {
  return Object.values(gAdornmentContentInfoMap).map((info) => {
    return {
      parentType: info.parentType,
      type: info.type,
    }
  })
}
