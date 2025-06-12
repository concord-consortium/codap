import { IDataSet } from "../data/data-set"
// eslint-disable-next-line import-x/no-cycle
import { DGDataContextAPI } from "./dg-data-context-api"
import { SCObject } from "../../v2/sc-compat"

export class DGCase extends SCObject {

  constructor(readonly data: IDataSet, readonly caseId: string, readonly api: DGDataContextAPI) {
    super()
  }

  get id() {
    return this.caseId
  }

  get collection() {
    return this.api.getCollectionForCase(this.caseId)
  }

  getStrValue(attrId: string) {
    return this.data.getStrValue(this.caseId, attrId)
  }

  getValue(attrId: string) {
    return this.data.getValue(this.caseId, attrId)
  }

  getForcedNumericValue(attrId: string) {
    const numValue = this.data.getNumeric(this.caseId, attrId)
    return numValue != null && isFinite(numValue) ? numValue : null
  }
}
