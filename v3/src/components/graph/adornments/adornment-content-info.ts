import { ICodapV2SimpleAdornmentsMap } from "../../../v2/codap-v2-types"
import { AttrRole } from "../../data-display/data-display-types"
import { PlotType } from "../graphing-types"
import { AdornmentModel, IAdornmentModel } from "./adornment-models"

export const ParentAdornmentTypes = ["Univariate Measure"] as const
export type ParentAdornmentType = typeof ParentAdornmentTypes[number]

export interface IAdornmentUndoRedoKeys {
  undoAdd: string,
  redoAdd: string,
  undoRemove: string,
  redoRemove: string
}

export interface IAdornmentExporterOptions {
  categoricalAttrs: Array<{ role: AttrRole, attrId: string }>
  isShowingCount: boolean
  isShowingPercent: boolean
  isShowingMovableValues: boolean
  isVisible?: boolean
  showMeasuresForSelection: boolean
}

export interface IAdornmentContentInfo {
  modelClass: typeof AdornmentModel
  plots: PlotType[]
  prefix: string
  parentType?: ParentAdornmentType
  type: string
  undoRedoKeys?: IAdornmentUndoRedoKeys
  exporter?: (model: IAdornmentModel, options: IAdornmentExporterOptions) => Maybe<ICodapV2SimpleAdornmentsMap>
}

export function exportAdornmentBase(model: IAdornmentModel, options: IAdornmentExporterOptions) {
  return {
    isVisible: options.isVisible ?? model.isVisible,
    enableMeasuresForSelection: options.showMeasuresForSelection
  }
}

export function exportAdornmentBaseWithCoordsArray(model: IAdornmentModel, options: IAdornmentExporterOptions) {
  return {
    ...exportAdornmentBase(model, options),
    // TODO_V2_EXPORT export label/equation coordinates for adornments
    equationCoordsArray: []
  }
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
