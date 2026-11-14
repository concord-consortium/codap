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
    const caseId1 = dataset.getCasesForCollection(dataset.collections[2].id)[1].__id__
    await request("update", "collection[collection3].caseByIndex[1]", { values: { a3: 20 } })
    expect(changes()).toEqual([{
      operation: "updateCases",
      result: { success: true, caseIDs: [toV2Id(caseId1)], cases: [expect.objectContaining({ __id__: caseId1 })] }
    }])
  })

  it("update sends updateCases when a parent case merges into an existing group, as the case table does",
    async () => {
      // collection1's "a" case takes the value of the existing "b" case, so it is gone after the change
      const aCaseId = dataset.getCasesForCollection(dataset.collections[0].id)[0].__id__
      await request("update", `collection[collection1].caseByID[${toV2Id(aCaseId)}]`, { values: { a1: "b" } })
      expect(changes()).toEqual([{ operation: "updateCases", result: { success: true, caseIDs: [], cases: [] } }])
    })

  it("list updates send updateCases when a case merges into an existing group", async () => {
    const empty = { operation: "updateCases", result: { success: true, caseIDs: [], cases: [] } }
    const parentCase = (collectionIndex: number, index: number) =>
      dataset.getCasesForCollection(dataset.collections[collectionIndex].id)[index].__id__
    // collection1's "a" case takes the value of the existing "b" case
    await request("update", "item", [{ id: toV2Id(parentCase(0, 0)), values: { a1: "b" } }])
    expect(changes()[0]).toEqual(empty)
    expect(operations()).toEqual(["updateCases", "updateItems"])

    // collection2's (b, z) case takes the value of the existing (b, y) case
    broadcastSpy.mockClear()
    const bzCase = dataset.getCasesForCollection(dataset.collections[1].id)
      .find(aCase => dataset.getStrValue(aCase.__id__, dataset.attrIDFromName("a2")!) === "z")!.__id__
    await request("update", "item", [{ id: toV2Id(bzCase), values: { a2: "y" } }])
    expect(operations()).toEqual(["updateCases", "updateItems"])
    expect(changes()[0]).toEqual(empty)

    // the same kind of change through collection[...].case: collection1's only case "b" takes a new value...
    broadcastSpy.mockClear()
    await request("update", "collection[collection1].case", [{ id: toV2Id(parentCase(0, 0)), values: { a1: "c" } }])
    expect(operations()).toEqual(["updateCases"])
    // ...and then merges back into a group that exists again
    await request("create", "item", [{ a1: "d", a2: "y", a3: 70 }])
    broadcastSpy.mockClear()
    await request("update", "collection[collection1].case", [{ id: toV2Id(parentCase(0, 1)), values: { a1: "c" } }])
    expect(changes()).toEqual([empty])
  })

  it("a list update compares against up-to-date grouping, so existing cases aren't reported as created",
    async () => {
      // a change made without revalidating leaves the grouping stale when the request arrives
      dataset.setCaseValues([{ __id__: dataset.itemIds[0], [dataset.attrIDFromName("a1")!]: "c" }])
      await request("update", "item", [{ id: toV2Id(dataset.itemIds[2]), values: { a3: 10 } }])
      expect(operations()).toEqual(["updateCases", "updateItems"])
    })

  it("a list update item given a case id names the items it changed, not those set aside", async () => {
    // collection1's "a" case holds items 0, 2 and 4; item 4 is set aside
    dataset.hideCasesOrItems([dataset.itemIds[4]])
    dataset.validateCases()
    const aCase = dataset.getCasesForCollection(dataset.collections[0].id)[0].__id__
    await request("update", "item", [{ id: toV2Id(aCase), values: { a3: 99 } }])
    expect(changes()[1].result.itemIDs).toEqual([dataset.itemIds[0], dataset.itemIds[2]].map(id => toV2Id(id)))
  })

  it("update compares against up-to-date grouping, so existing cases aren't reported as created", async () => {
    // a change made without revalidating leaves the grouping stale when the request arrives
    dataset.setCaseValues([{ __id__: dataset.itemIds[0], [dataset.attrIDFromName("a1")!]: "c" }])
    await request("update", `itemByID[${toV2Id(dataset.itemIds[2])}]`, { a3: 10 })
    expect(operations()).toEqual(["updateCases", "updateItems"])
  })

  it("update also sends createCases when the change regroups the case, and nothing when no attribute matches",
    async () => {
      // item 0 has a1 "a"; giving it a new a1 value creates a new parent case for it
      const itemId = dataset.itemIds[0]
      const caseId = childCase(0)
      await request("update", `itemByID[${toV2Id(itemId)}]`, { a1: "c" })
      expect(operations()).toEqual(["updateCases", "createCases", "updateItems"])
      expect(changes().slice(0, 2)).toEqual([
        {
          operation: "updateCases",
          result: { success: true, caseIDs: [toV2Id(caseId)], cases: [expect.objectContaining({ __id__: caseId })] }
        },
        {
          operation: "createCases",
          result: expect.objectContaining({
            success: true, caseIDs: expect.any(Array), itemIDs: [toV2Id(itemId), toV2Id(itemId)]
          })
        }
      ])
      expect(changes()[1].result.caseIDs).toHaveLength(2)

      broadcastSpy.mockClear()
      await request("update", `itemByID[${toV2Id(dataset.itemIds[0])}]`, { noSuchAttribute: 1 })
      expect(operations()).toEqual([])
    })

  it("update itemByID, itemByCaseID and item[index] send updateCases for the item's case, then updateItems",
    async () => {
      const itemId = dataset.itemIds[2]
      await request("update", `itemByID[${toV2Id(itemId)}]`, { a3: 10 })
      expect(operations()).toEqual(["updateCases", "updateItems"])
      expect(changes()[0].result.caseIDs).toEqual([toV2Id(dataset.getItemChildCaseId(itemId)!)])
      expect(changes()[1].result).toEqual({ success: true, itemIDs: [toV2Id(itemId)] })

      broadcastSpy.mockClear()
      await request("update", `itemByCaseID[${toV2Id(childCase(3))}]`, { a3: 20 })
      expect(operations()).toEqual(["updateCases", "updateItems"])

      broadcastSpy.mockClear()
      await request("update", "item[4]", { a3: 30 })
      expect(operations()).toEqual(["updateCases", "updateItems"])
    })

  it("update item with a list reports the items' cases, then sends updateItems", async () => {
    const itemIds = [dataset.itemIds[1], dataset.itemIds[3]]
    await request("update", "item", itemIds.map((id, i) => ({ id: toV2Id(id), values: { a3: 100 + i } })))
    expect(operations()).toEqual(["updateCases", "updateItems"])
    expect(changes()[0].result.caseIDs).toEqual(itemIds.map(id => toV2Id(dataset.getItemChildCaseId(id)!)))
    expect(changes()[1].result.itemIDs).toEqual(itemIds.map(id => toV2Id(id)))
  })

  it("updating cases, rather than items, sends no updateItems", async () => {
    await request("update", "collection[collection3].case", [{ id: toV2Id(childCase(0)), values: { a3: 7 } }])
    expect(operations()).toEqual(["updateCases"])
  })

  it("create case that fills a new parent's empty child case sends createCases for it, as in V2", async () => {
    await request("create", "collection[collection1].case", { values: { a1: "p" } })
    const parentId = dataset.getCasesForCollection(dataset.collections[0].id).find(aCase =>
      dataset.getStrValue(aCase.__id__, dataset.attrIDFromName("a1")!) === "p")!.__id__
    const itemId = dataset.caseInfoMap.get(parentId)!.childItemIds[0]
    broadcastSpy.mockClear()
    await request("create", "collection[collection2].case", { parent: toV2Id(parentId), values: { a2: "q" } })
    const filledCaseId = dataset.getItemCaseIds(itemId).find(id => dataset.collections[1].hasCase(id))!
    expect(changes()).toEqual([{
      operation: "createCases",
      result: {
        success: true, caseIDs: [toV2Id(filledCaseId)], itemIDs: [toV2Id(itemId)],
        caseID: toV2Id(filledCaseId), itemID: toV2Id(itemId)
      }
    }])
  })

  it("update case with values given as an array sends updateCases", async () => {
    const caseId = childCase(0)
    await request("update", "collection[collection3].case", [{ id: toV2Id(caseId), values: [10, -10] }])
    expect(changes()).toEqual([{
      operation: "updateCases",
      result: { success: true, caseIDs: [toV2Id(caseId)], cases: [expect.objectContaining({ __id__: caseId })] }
    }])
  })

  it("update caseByID with no collection reads an array in the order of the case's own collection", async () => {
    const caseId = childCase(0)
    await request("update", `caseByID[${toV2Id(caseId)}]`, { values: [10, -10] })
    expect(dataset.getNumeric(dataset.itemIds[0], dataset.attrIDFromName("a3")!)).toBe(10)
    expect(dataset.getNumeric(dataset.itemIds[0], dataset.attrIDFromName("a4")!)).toBe(-10)
    expect(operations()).toEqual(["updateCases"])
  })

  it("update item ignores values given as an array, even with a collection segment", async () => {
    const itemId = toV2Id(dataset.itemIds[0])
    const a3 = dataset.attrIDFromName("a3")!
    const a4 = dataset.attrIDFromName("a4")!
    const before = [dataset.getValue(dataset.itemIds[0], a3), dataset.getValue(dataset.itemIds[0], a4)]
    await processAction({ action: "update", values: [80, 81],
      resource: `dataContext[${dataset.name}].collection[collection3].itemByID[${itemId}]` })
    await processAction({ action: "update", values: [{ id: itemId, values: [90, 91] }],
      resource: `dataContext[${dataset.name}].collection[collection3].item` })
    expect([dataset.getValue(dataset.itemIds[0], a3), dataset.getValue(dataset.itemIds[0], a4)]).toEqual(before)
  })

  it("notify caseByIndex and caseByID with caseOrder send moveCases with the moved case, as in V2", async () => {
    const childCases = () => dataset.getCasesForCollection(dataset.collections[2].id).map(({ __id__ }) => __id__)
    const movedId = childCases()[4]
    await request("notify", "collection[collection3].caseByIndex[4]", { caseOrder: 3 })
    expect(childCases()[3]).toBe(movedId)
    expect(changes()).toEqual([{ operation: "moveCases", result: { success: true, caseIDs: [toV2Id(movedId)] } }])

    // as in V2, it is sent even when the case is already there
    broadcastSpy.mockClear()
    await request("notify", `collection[collection3].caseByID[${toV2Id(movedId)}]`, { caseOrder: 3 })
    expect(operations()).toEqual(["moveCases"])
  })

  it("create item sends createCases for each collection, then createItems", async () => {
    await request("create", "item", [{ a1: "new", a2: "w", a3: 50, a4: -50 }])
    // a new parent, a new middle case and a new child case
    expect(operations()).toEqual(["createCases", "createCases", "createCases", "createItems"])
    const createItems = changes()[3].result
    const newItemId = dataset.itemIds[dataset.itemIds.length - 1]
    // as in V2, itemIDs lists, alongside each created case, the item it was built from
    expect(createItems.caseIDs).toHaveLength(3)
    expect(createItems.itemIDs).toEqual([toV2Id(newItemId), toV2Id(newItemId), toV2Id(newItemId)])
    expect(createItems.success).toBe(true)
  })

  it("create item pairs each created case with its first item when one parent gets several items", async () => {
    const response = await processAction({ action: "create", resource: `dataContext[${dataset.name}].item`,
      values: [{ a1: "new", a2: "w", a3: 50 }, { a1: "new", a2: "v", a3: 51 }] })
    const [i1, i2] = (response as any).itemIDs
    expect(operations()).toEqual(["createCases", "createCases", "createCases", "createItems"])
    const caseIDs = changes().slice(0, 3).flatMap(change => change.result.caseIDs)
    // one parent, then each item's middle and child cases in collection order
    expect(changes()[3].result).toEqual({ success: true, caseIDs, itemIDs: [i1, i1, i2, i1, i2] })
  })

  it("update item with a list sends createCases when it regroups, and nothing when no attribute matches",
    async () => {
      const itemId = dataset.itemIds[0]
      await request("update", "item", [{ id: toV2Id(itemId), values: { a1: "c" } }])
      expect(operations()).toEqual(["updateCases", "createCases", "updateItems"])

      broadcastSpy.mockClear()
      await request("update", "item", [{ id: toV2Id(itemId), values: { noSuchAttribute: 1 } }])
      expect(operations()).toEqual([])
    })

  it("update item with a list names each changed item once", async () => {
    const itemId = dataset.itemIds[2]
    await request("update", "item",
      [{ id: toV2Id(itemId), values: { a3: 1 } }, { id: toV2Id(itemId), values: { a3: 2 } }])
    expect(changes()[0].result.caseIDs).toEqual([toV2Id(dataset.getItemChildCaseId(itemId)!)])
    expect(changes()[1].result.itemIDs).toEqual([toV2Id(itemId)])
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

  it("delete itemByID, itemByCaseID and item[index] send deleteCases, then deleteItems", async () => {
    const caseId = childCase(0)
    const itemId = dataset.itemIds[0]
    await request("delete", `itemByID[${toV2Id(itemId)}]`)
    expect(operations()).toEqual(["deleteCases", "deleteItems"])
    expect(caseIDsOf(changes()[0])).toEqual([toV2Id(caseId)])
    expect(changes()[1].result).toEqual({ success: true, itemIDs: [toV2Id(itemId)] })

    broadcastSpy.mockClear()
    await request("delete", `itemByCaseID[${toV2Id(childCase(0))}]`)
    expect(operations()).toEqual(["deleteCases", "deleteItems"])

    broadcastSpy.mockClear()
    await request("delete", "item[0]")
    expect(operations()).toEqual(["deleteCases", "deleteItems"])
  })

  it("delete item with a list names each existing item once, and sends no deleteItems when none existed",
    async () => {
      const [item0, item4] = [dataset.itemIds[0], dataset.itemIds[4]]
      dataset.hideCasesOrItems([item4])
      dataset.validateCases()
      const unknownId = 999999999
      await request("delete", "item",
        [{ id: toV2Id(item0) }, { id: toV2Id(item0) }, { id: toV2Id(item4) }, { id: unknownId }])
      expect(operations()).toEqual(["deleteCases", "deleteItems"])
      expect(changes()[1].result).toEqual({ success: true, itemIDs: [toV2Id(item0), toV2Id(item4)] })

      broadcastSpy.mockClear()
      await request("delete", "item", [{ id: unknownId }])
      expect(operations()).toEqual(["deleteCases"])
    })

  it("delete itemSearch sends deleteCases, then deleteItems, for every matching item", async () => {
    const matchingItemIds = dataset.itemIds.filter(id => dataset.getStrValue(id, dataset.attrIDFromName("a1")!) === "a")
    await request("delete", "itemSearch[a1==a]")
    expect(operations()).toEqual(["deleteCases", "deleteItems"])
    expect(changes()[0].result.cases).toHaveLength(3)
    expect(changes()[1].result.itemIDs).toEqual(matchingItemIds.map(id => toV2Id(id)))
  })

  it("deleting cases, rather than items, sends no deleteItems", async () => {
    await request("delete", `collection[collection3].caseByID[${toV2Id(childCase(0))}]`)
    expect(operations()).toEqual(["deleteCases"])
  })

  it("notify itemSearch with itemOrder sends moveCases when the order changes", async () => {
    await request("notify", "itemSearch[a3==6]", { itemOrder: "first" })
    expect(changes()).toEqual([{ operation: "moveCases", result: { success: true, caseIDs: [] } }])

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
    expect(changes()).toEqual([{ operation: "deleteCollection", result: { success: true } }])
  })

  it("update collection sends updateCollection when something changes", async () => {
    await request("update", "collection[collection1]", { title: "First" })
    expect(operations()).toEqual(["updateCollection"])
    expect(changes()[0].result.properties).toEqual({ name: "collection1", title: "First" })

    broadcastSpy.mockClear()
    await request("update", "collection[collection2]", { labels: { singleCase: "thing" } })
    expect(operations()).toEqual(["updateCollection"])

    broadcastSpy.mockClear()
    await request("update", "collection[collection1]", {})
    expect(operations()).toEqual([])
  })
})
