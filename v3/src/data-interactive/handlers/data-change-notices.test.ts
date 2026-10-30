import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { processAction } from "../data-interactive-request-processor"
import { DIAction } from "../data-interactive-types"

// API paths that change data must send the same dataContextChangeNotice as the equivalent UI action
describe("API data changes send dataContextChangeNotice", () => {
  const { content } = appState.document
  let sharedDataSet: ISharedDataSet
  let dataset: IDataSet
  let broadcastSpy: jest.SpyInstance

  beforeEach(() => {
    const source = setupTestDataset().dataset
    // attribute values are only included in the snapshot when it's prepared
    source.prepareSnapshot()
    sharedDataSet = content!.createDataSet(getSnapshot(source)).sharedDataSet
    dataset = sharedDataSet.dataSet
    dataset.validateCases()
    broadcastSpy = jest.spyOn(content!, "broadcastMessage")
  })

  afterEach(() => {
    broadcastSpy.mockRestore()
    content!.removeSharedModelsAndTiles([sharedDataSet])
  })

  // the changes in this context's notices, whether values is a single change or an array of them
  function changes() {
    return broadcastSpy.mock.calls
      .map(([message]) => message)
      .filter(message => message.resource === `dataContextChangeNotice[${dataset.name}]`)
      .flatMap(message => ([] as any[]).concat(message.values))
  }
  const operations = () => changes().map(({ operation }) => operation)

  async function request(action: DIAction["action"], resource: string, values?: any) {
    const result = await processAction({ action, resource: `dataContext[${dataset.name}].${resource}`, values })
    expect(result.success).toBe(true)
  }

  const childCase = (itemIndex: number) => dataset.getItemChildCaseId(dataset.itemIds[itemIndex])!
  // without the plugin-side adapter registered, notices carry the cases as they are in the model
  const caseIDsOf = (change: any) => change.result.cases.map((aCase: any) => toV2Id(aCase.__id__))

  it("update caseByID and caseByIndex send updateCases", async () => {
    const caseId = childCase(0)
    await request("update", `collection[collection3].caseByID[${toV2Id(caseId)}]`, { values: { a3: 10 } })
    expect(operations()).toEqual(["updateCases"])
    expect(changes()[0].result.caseIDs).toEqual([toV2Id(caseId)])

    broadcastSpy.mockClear()
    await request("update", "collection[collection3].caseByIndex[1]", { values: { a3: 20 } })
    expect(operations()).toEqual(["updateCases"])
  })

  it("update also sends createCases when the change regroups the case, and nothing when no attribute matches",
    async () => {
      // item 0 has a1 "a"; giving it a new a1 value creates a new parent case for it
      await request("update", `itemByID[${toV2Id(dataset.itemIds[0])}]`, { a1: "c" })
      expect(operations()).toEqual(["updateCases", "createCases"])

      broadcastSpy.mockClear()
      await request("update", `itemByID[${toV2Id(dataset.itemIds[0])}]`, { noSuchAttribute: 1 })
      expect(operations()).toEqual([])
    })

  it("update itemByID, itemByCaseID and item[index] send updateCases for the item's case", async () => {
    const itemId = dataset.itemIds[2]
    await request("update", `itemByID[${toV2Id(itemId)}]`, { a3: 10 })
    expect(operations()).toEqual(["updateCases"])
    expect(changes()[0].result.caseIDs).toEqual([toV2Id(dataset.getItemChildCaseId(itemId)!)])

    broadcastSpy.mockClear()
    await request("update", `itemByCaseID[${toV2Id(childCase(3))}]`, { a3: 20 })
    expect(operations()).toEqual(["updateCases"])

    broadcastSpy.mockClear()
    await request("update", "item[4]", { a3: 30 })
    expect(operations()).toEqual(["updateCases"])
  })

  it("delete caseByID and caseByIndex send deleteCases with the deleted case", async () => {
    const caseId = childCase(0)
    await request("delete", `collection[collection3].caseByID[${toV2Id(caseId)}]`)
    expect(operations()).toEqual(["deleteCases"])
    expect(caseIDsOf(changes()[0])).toEqual([toV2Id(caseId)])

    broadcastSpy.mockClear()
    const nextCaseId = childCase(0)
    await request("delete", "collection[collection3].caseByIndex[0]")
    expect(operations()).toEqual(["deleteCases"])
    expect(caseIDsOf(changes()[0])).toEqual([toV2Id(nextCaseId)])
  })

  it("delete itemByID, itemByCaseID and item[index] send deleteCases", async () => {
    const caseId = childCase(0)
    await request("delete", `itemByID[${toV2Id(dataset.itemIds[0])}]`)
    expect(operations()).toEqual(["deleteCases"])
    expect(caseIDsOf(changes()[0])).toEqual([toV2Id(caseId)])

    broadcastSpy.mockClear()
    await request("delete", `itemByCaseID[${toV2Id(childCase(0))}]`)
    expect(operations()).toEqual(["deleteCases"])

    broadcastSpy.mockClear()
    await request("delete", "item[0]")
    expect(operations()).toEqual(["deleteCases"])
  })

  it("delete itemSearch sends deleteCases for every matching item", async () => {
    await request("delete", "itemSearch[a1==a]")
    expect(operations()).toEqual(["deleteCases"])
    expect(changes()[0].result.cases).toHaveLength(3)
  })

  it("notify itemSearch with itemOrder sends moveCases when the order changes", async () => {
    await request("notify", "itemSearch[a3==6]", { itemOrder: "first" })
    expect(operations()).toEqual(["moveCases"])

    // already first, so nothing moves
    broadcastSpy.mockClear()
    await request("notify", "itemSearch[a3==6]", { itemOrder: "first" })
    expect(operations()).toEqual([])
  })

  it("delete allCases sends deleteCases", async () => {
    await request("delete", "collection[collection3].allCases")
    expect(operations()).toEqual(["deleteCases"])
    expect(changes()[0].result.cases).toHaveLength(6)
  })

  it("delete attribute sends deleteAttributes, preceded by deleteCollection when the collection goes", async () => {
    const a4Id = dataset.getAttributeByName("a4")!.id
    await request("delete", "collection[collection3].attribute[a4]")
    expect(operations()).toEqual(["deleteAttributes"])
    expect(changes()[0].result.attrIDs).toEqual([toV2Id(a4Id)])

    broadcastSpy.mockClear()
    await request("delete", "collection[collection1].attribute[a1]")
    expect(operations()).toEqual(["deleteCollection", "deleteAttributes"])
  })

  it("delete collection sends deleteCollection", async () => {
    await request("delete", "collection[collection1]")
    expect(operations()).toEqual(["deleteCollection"])
  })

  it("update collection sends updateCollection when something changes", async () => {
    await request("update", "collection[collection1]", { title: "First" })
    expect(operations()).toEqual(["updateCollection"])
    expect(changes()[0].result.properties).toEqual({ name: "collection1", title: "First" })

    broadcastSpy.mockClear()
    await request("update", "collection[collection1]", {})
    expect(operations()).toEqual([])
  })
})
