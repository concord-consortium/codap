import { action, computed, makeObservable, observable } from "mobx"
import { createDataSetMetadata, IDataSetMetadata } from "../shared/data-set-metadata"
import { ISharedDataSet, SharedDataSet, kSharedDataSetType } from "../shared/shared-data-set"
import { getMetadataFromDataSet } from "../shared/shared-data-utils"
import { ISharedModelManager } from "../shared/shared-model-manager"
import { IDataSet } from "./data-set"
import { t } from "../../utilities/translation/translate"

import "../shared/data-set-metadata-registration"
import "../shared/shared-data-set-registration"

export interface IDataSetSummary {
  id: string;
  name: string;
  attributes: number;
  cases: number;
}

interface IDataBrokerOptions {
  sharedModelManager?: ISharedModelManager
  allowMultiple?: boolean
}
export class DataBroker {
  @observable selectedDataSetId = ""
  sharedModelManager?: ISharedModelManager

  constructor(options?: IDataBrokerOptions) {
    const { sharedModelManager } = options || {}
    makeObservable(this)
    this.sharedModelManager = sharedModelManager
  }

  @computed
  get dataSets() {
    const dataArray = this.sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
    const dataSetsMap = new Map<string, IDataSet>()
    dataArray.forEach(set => dataSetsMap.set(set.dataSet.id, set.dataSet))
    return dataSetsMap
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
    return Array.from(this.dataSets.values()).map(({ id, name, attributes, items }) =>
      ({ id, name, attributes: attributes.length, cases: items.length }))
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

  get newDataSetName(): string {
    let i = 1
    let name = ""
    const tryName = () => name = t("DG.DataContext.baseName", { vars: [i] })
    tryName()
    while (this.getDataSetByName(name)) {
      i++
      tryName()
    }
    return name
  }

  @action
  setSharedModelManager(manager: ISharedModelManager) {
    this.sharedModelManager = manager
  }

  @action
  setSelectedDataSetId(id:string) {
    this.selectedDataSetId = id || this.last?.id || ""
  }

  @action
  addDataSet(ds: IDataSet, providerId?: string) {
    const sharedData = SharedDataSet.create({providerId})
    sharedData.setDataSet(ds)
    // so values are captured in undo/redo patches
    ds.prepareSnapshot()
    this.sharedModelManager?.addSharedModel(sharedData)

    let sharedMetadata = createDataSetMetadata(ds)
    this.sharedModelManager?.addSharedModel(sharedMetadata)
    // shared model manager may have cloned the metadata object
    sharedMetadata = getMetadataFromDataSet(ds) ?? sharedMetadata

    this.addSharedDataSet(sharedData)
    ds.completeSnapshot()

    return { sharedData, sharedMetadata }
  }

  @action
  addDataAndMetadata(data: ISharedDataSet, metadata: IDataSetMetadata) {
    this.sharedModelManager?.addSharedModel(data)
    metadata.setData(data.dataSet)
    this.sharedModelManager?.addSharedModel(metadata)

    this.addSharedDataSet(data)
  }

  @action
  addSharedDataSet(shared: ISharedDataSet) {
    const ds = shared.dataSet
    this.dataSets.set(ds.id, ds)
    this.setSelectedDataSetId(ds.id)
  }

  @action
  removeDataSet(id: string) {
    const { sharedModelManager } = this
    const metadata = getMetadataFromDataSet(this.getDataSet(id))
    if (metadata) sharedModelManager?.removeSharedModel(metadata.id)
    sharedModelManager?.removeSharedModel(id)
  }

  @action
  clear() {
    const { sharedModelManager } = this
    const sharedDataSets = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
    sharedDataSets.forEach(shared => this.removeDataSet(shared.dataSet.id))
  }
}

export const gDataBroker = new DataBroker({ allowMultiple: true })
