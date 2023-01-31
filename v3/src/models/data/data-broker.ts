import { action, makeObservable, observable } from "mobx"
import { ISharedModelDocumentManager } from "../document/shared-model-document-manager"
import { ISharedDataSet, SharedDataSet } from "../shared/shared-data-set"
import { IDataSet } from "./data-set"

export interface IDataSetSummary {
  id: string;
  name: string;
  attributes: number;
  cases: number;
}

interface IDataBrokerOptions {
  allowMultiple?: boolean
}
export class DataBroker {
  @observable dataSets = new Map<string, IDataSet>()
  readonly allowMultiple: boolean
  @observable selectedDataSetId = ""
  sharedModelManager?: ISharedModelDocumentManager

  constructor(options?: IDataBrokerOptions) {
    const { allowMultiple = true } = options || {}
    makeObservable(this)
    this.allowMultiple = allowMultiple
  }

  get length() {
    return this.dataSets.size
  }

  get first(): IDataSet | undefined {
    return this.dataSets.values().next().value
  }

  get last(): IDataSet | undefined {
    let dsLast: IDataSet | undefined
    this.dataSets.forEach(ds => dsLast = ds)
    return dsLast
  }

  get summaries() {
    return Array.from(this.dataSets.values()).map(({ id, name, attributes, cases }) =>
      ({ id, name, attributes: attributes.length, cases: cases.length }))
  }

  get selectedDataSet(): IDataSet | undefined {
    return this.getDataSet(this.selectedDataSetId)
  }
  getDataSet(id: string): IDataSet | undefined {
    return this.dataSets.get(id)
  }

  getDataSetByName(name: string): IDataSet | undefined {
    for (const ds of this.dataSets.values()) {
      if (ds.name === name) return ds
    }
  }

  @action
  setSharedModelManager(manager: ISharedModelDocumentManager) {
    this.sharedModelManager = manager
  }

  @action
  setSelectedDataSetId(id:string) {
    this.selectedDataSetId = id || this.last?.id || ""
  }

  @action
  addDataSet(ds: IDataSet) {
    const sharedModel = SharedDataSet.create()
    sharedModel.setDataSet(ds)
    this.sharedModelManager?.addSharedModel(sharedModel)

    !this.allowMultiple && this.dataSets.clear()
    this.addSharedDataSet(sharedModel)
  }

  @action
  addSharedDataSet(shared: ISharedDataSet) {
    const ds = shared.dataSet
    this.dataSets.set(ds.id, ds)
    this.setSelectedDataSetId(ds.id)
  }

  @action
  removeDataSet(id: string) {
    this.dataSets.delete(id)
  }

  @action
  clear() {
    this.dataSets.clear()
  }

  prepareSnapshots() {
    this.dataSets.forEach(data => data.prepareSnapshot())
  }

  completeSnapshots() {
    this.dataSets.forEach(data => data.completeSnapshot())
  }
}

export const gDataBroker = new DataBroker({ allowMultiple: true })
