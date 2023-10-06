import { AdornmentModel } from "./adornment-models"
import { PlotType } from "../graphing-types"
import { ParentAdornmentType } from "./adornment-types"

export interface IAdornmentUndoRedoKeys {
  undoAdd: string,
  redoAdd: string,
  undoRemove: string,
  redoRemove: string
}
export interface IAdornmentContentInfo {
  modelClass: typeof AdornmentModel
  plots: PlotType[]
  prefix: string
  parentType?: ParentAdornmentType
  type: string
  undoRedoKeys?: IAdornmentUndoRedoKeys
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
  return Object.values(gAdornmentContentInfoMap).map(({ parentType, type }) => ({ parentType, type }))
}
