import { IDataSet } from "../../models/data/data-set"
import { Rect } from "./data-display-types"
import { IDataConfigurationModel } from "./models/data-configuration-model"

export interface IGetTipTextProps {
  attributeIDs: string[]
  caseID: string
  dataConfig?: IDataConfigurationModel
  dataset?: IDataSet
  legendAttrID?: string
}

export interface IShowDataTipProps {
  event: PointerEvent
  caseID: string
  plotNum: number
  // Optional viewport-space rect of the anchor (e.g. the hovered point). When provided,
  // the tip is positioned relative to this rect rather than the pointer location, so the
  // tip's placement is not affected by cursor-size differences across browsers.
  anchorRect?: Rect
}
