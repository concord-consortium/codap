import { action, makeObservable, observable } from "mobx"
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
  selectedDataSetId: string

  constructor(options?: IDataBrokerOptions) {
    const { allowMultiple = true } = options || {}
    makeObservable(this)
    this.allowMultiple = allowMultiple
    this.selectedDataSetId = ""
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
    console.log("in getDataSet", id)
    return this.dataSets.get(id)
  }

  getDataSetByName(name: string): IDataSet | undefined {
    for (const ds of this.dataSets.values()) {
      if (ds.name === name) return ds
    }
  }

  setSelectedDataSetId(id:string) {
    console.log("in setSelectedDataSetId", id)
    this.selectedDataSetId = id
  }

  @action
  addDataSet(ds: IDataSet) {
    !this.allowMultiple && this.dataSets.clear()
    this.dataSets.set(ds.id, ds)
  }

  @action
  removeDataSet(id: string) {
    this.dataSets.delete(id)
  }

  @action
  clear() {
    this.dataSets.clear()
  }
}

export const gDataBroker = new DataBroker({ allowMultiple: true })
