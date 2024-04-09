import { IDataSet } from "../../models/data/data-set"
import { IDataConfigurationModel } from "./models/data-configuration-model"

export interface IGetTipTextProps {
  attributeIDs: string[]
  caseID: string
  dataConfig?: IDataConfigurationModel
  dataset?: IDataSet
  legendAttrID?: string
}
