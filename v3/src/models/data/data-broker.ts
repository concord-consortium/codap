import { action, computed, makeObservable, observable } from "mobx"
import { ISharedCaseMetadata, SharedCaseMetadata } from "../shared/shared-case-metadata"
import { ISharedDataSet, SharedDataSet, kSharedDataSetType } from "../shared/shared-data-set"
import { ISharedModelManager } from "../shared/shared-model-manager"
import { IDataSet } from "./data-set"
import { t } from "../../utilities/translation/translate"
import "../shared/shared-data-set-registration"
import "../shared/shared-case-metadata-registration"

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
    return Array.from(this.dataSets.values()).map(({ id, name, attributes, items: cases }) =>
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
    const sharedModel = SharedDataSet.create({providerId})
    sharedModel.setDataSet(ds)
    // so values are captured in undo/redo patches
    ds.prepareSnapshot()
    this.sharedModelManager?.addSharedModel(sharedModel)

    const caseMetadata = SharedCaseMetadata.create()
    caseMetadata.setData(ds)
    this.sharedModelManager?.addSharedModel(caseMetadata)

    this.addSharedDataSet(sharedModel)
    ds.completeSnapshot()

    return { sharedData: sharedModel, caseMetadata }
  }

  @action
  addDataAndMetadata(data: ISharedDataSet, metadata: ISharedCaseMetadata) {
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
