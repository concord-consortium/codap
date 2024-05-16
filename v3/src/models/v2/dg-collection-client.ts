import { ICollectionPropsModel } from "../data/collection"
import { IDataSet } from "../data/data-set"
import { DGCase } from "./dg-case"
import { DGCollection } from "./dg-collection"
import { DGDataContextAPI } from "./dg-data-context-api"
import { SCObject } from "../../v2/sc-compat"

class DGCasesController extends SCObject {

  constructor(public data: IDataSet, public api: DGDataContextAPI) {
    super()
  }

  get selection() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this
    return {
      toArray() {
        return Array.from(_this.data.selection).map(caseId => new DGCase(_this.data, caseId, _this.api))
      }
    }
  }
}

export class DGCollectionClient extends SCObject {
  collection: DGCollection
  casesController: DGCasesController

  constructor(readonly data: IDataSet, collection: ICollectionPropsModel, readonly api: DGDataContextAPI) {
    super()
    this.collection = new DGCollection(data, collection, api)
    this.casesController = new DGCasesController(data, api)
  }

  get id() {
    return this.collection.get("id")
  }

  get name() {
    return this.collection.get("name")
  }

  get attrs() {
    return this.collection.get("attrs")
  }

  get cases() {
    return this.collection.get("cases")
  }

  getCaseAt(caseIndex: number) {
    // TODO: deal with hierarchy
    return new DGCase(this.data, this.data.cases[caseIndex].__id__, this.api)
  }

  getCaseIndexByID(caseId: string) {
    return this.data.caseIndexFromID(caseId)
  }
}
