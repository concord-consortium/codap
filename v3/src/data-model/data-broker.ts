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

  getDataSet(id: string): IDataSet | undefined {
    return this.dataSets.get(id)
  }

  getDataSetByName(name: string): IDataSet | undefined {
    for (const ds of this.dataSets.values()) {
      if (ds.name === name) return ds
    }
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

// for MVP we only support a single DataSet
export const gDataBroker = new DataBroker({ allowMultiple: false })
