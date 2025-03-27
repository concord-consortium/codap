import { reaction } from "mobx"
import { DataBroker } from "./data-broker"
import { DataSet, IDataSet, toCanonical } from "./data-set"
import { IDocumentModel } from "../document/document"
import { createCodapDocument } from "../codap/create-codap-document"
import { ISharedModelManager } from "../shared/shared-model-manager"
import { getSharedModelManager } from "../tiles/tile-environment"

describe("DataBroker", () => {
  let document: IDocumentModel
  let sharedModelManager: ISharedModelManager | undefined
  let broker: DataBroker
  let dsEmpty: IDataSet
  let dsCases: IDataSet

  beforeEach(() => {
    document = createCodapDocument()
    sharedModelManager = getSharedModelManager(document)
    broker = new DataBroker({ sharedModelManager })
    dsEmpty = DataSet.create({ name: "empty"})
    dsCases = DataSet.create({ name: "cases" })
    dsCases.addAttribute({ name: "a" })
    dsCases.addCases(toCanonical(dsCases, [{ a: 1 }, { a: 2 }, { a: 3 }]))
  })

  it("should work as expected when empty", () => {
    expect(broker.length).toBe(0)
    expect(broker.first).toBeUndefined()
    expect(broker.last).toBeUndefined()
    expect(broker.summaries).toEqual([])
    expect(broker.getDataSet("foo")).toBeUndefined()
    expect(broker.getDataSetByName("foo")).toBeUndefined()
  })

  it("should work as expected with a single DataSet", () => {
    broker.addDataSet(dsEmpty)
    expect(broker.length).toBe(1)
    expect(broker.first).toEqual(dsEmpty)
    expect(broker.last).toEqual(dsEmpty)
    expect(broker.summaries).toEqual([{ id: dsEmpty.id, name: "empty", attributes: 0, cases: 0 }])
    expect(broker.getDataSet(dsEmpty.id)).toEqual(dsEmpty)
    expect(broker.getDataSetByName("empty")).toEqual(dsEmpty)
  })

  it("should work as expected with multiple DataSets", () => {
    broker.addDataSet(dsEmpty)
    broker.addDataSet(dsCases)
    expect(broker.length).toBe(2)
    expect(broker.first).toEqual(dsEmpty)
    expect(broker.last).toEqual(dsCases)
    expect(broker.summaries).toEqual([
      { id: dsEmpty.id, name: "empty", attributes: 0, cases: 0 },
      { id: dsCases.id, name: "cases", attributes: 1, cases: 3 }])
    expect(broker.getDataSet(dsCases.id)).toEqual(dsCases)
    expect(broker.getDataSetByName("cases")).toEqual(dsCases)

    broker.removeDataSet(dsEmpty.id)
    expect(broker.length).toBe(1)
    expect(broker.first).toEqual(dsCases)
    expect(broker.last).toEqual(dsCases)
    expect(broker.summaries).toEqual([{ id: dsCases.id, name: "cases", attributes: 1, cases: 3 }])
  })

  it("should be observable using MobX mechanisms", () => {
    let lastSummaries: any
    const handler = jest.fn((summaries: any) => lastSummaries = summaries)
    reaction(() => broker.summaries, summaries => handler(summaries))
    // adding a DataSet triggers the reaction
    broker.addDataSet(dsCases)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(lastSummaries).toEqual([
      { id: dsCases.id, name: "cases", attributes: 1, cases: 3 }])
    broker.addDataSet(dsEmpty)
    expect(handler).toHaveBeenCalledTimes(2)
    expect(lastSummaries).toEqual([
      { id: dsCases.id, name: "cases", attributes: 1, cases: 3 },
      { id: dsEmpty.id, name: "empty", attributes: 0, cases: 0 }])
    // removing a DataSet triggers the reaction
    broker.removeDataSet(dsEmpty.id)
    expect(handler).toHaveBeenCalledTimes(3)
    expect(lastSummaries).toEqual([{ id: dsCases.id, name: "cases", attributes: 1, cases: 3 }])
  })

})
