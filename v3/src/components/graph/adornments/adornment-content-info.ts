import { AdornmentModel, IAdornmentModel } from "./adornment-models"
import { PlotType } from "../graphing-types"
import { IGraphModel } from "../models/graph-model"

export interface ICreateAdornmentOptions {
  graphModel: IGraphModel
}

export interface IAdornmentContentInfo {
  modelClass: typeof AdornmentModel
  createModel?: (options?: ICreateAdornmentOptions) => IAdornmentModel
  plots: PlotType[]
  prefix: string
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
  return Object.values(gAdornmentContentInfoMap).map(info => info.type)
}
