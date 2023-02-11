import { CollectionModel } from "./collection"
import { DataSet, IDataSet } from "./data-set"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  uniqueId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))

describe("CollectionGroups", () => {

  let data: IDataSet

  beforeEach(() => {
    mockNodeIdCount = 0

    data = DataSet.create()
    data.addAttribute({ id: "aId", name: "a" })
    data.addAttribute({ id: "bId", name: "b" })
    data.addAttribute({ id: "cId", name: "c" })
    for (let a = 1; a <= 3; ++a) {
      for (let b = 1; b<= 3; ++b) {
        for (let c = 1; c <= 3; ++c) {
          data.addCases([{ __id__: `${a}-${b}-${c}`, aId: `${a}`, bId: `${b}`, cId: `${c}` }])
        }
      }
    }
  })

  it("handles ungrouped data", () => {
    expect(data.collectionGroups).toEqual([])
    expect(data.getCasesForCollection("foo")).toEqual([])
    expect(data.getCasesForAttributes(["aId"])).toEqual(data.cases)
    expect(data.getCasesForAttributes(["bId"])).toEqual(data.cases)
    expect(data.getCasesForAttributes(["cId"])).toEqual(data.cases)
  })

  it("handles grouping by a single attribute", () => {
    const collection = CollectionModel.create()
    collection.addAttribute(data.attrFromID("aId"))
    data.addCollection(collection)

    expect(collection.id).toBe("COLLtest-2")
    expect(data.collectionGroups.length).toBe(1)
    expect(data.getCollection(collection.id)).toBe(collection)
    const aCases = data.getCasesForAttributes(["aId"])
    expect(data.getCasesForCollection(collection.id)).toEqual(aCases)
    expect(aCases.length).toBe(3)
    expect(aCases.map((c: any) => c.aId)).toEqual(["1", "2", "3"])
    const abCases = data.getCasesForAttributes(["aId", "bId"])
    expect(abCases.length).toBe(27)
  })

  it("handles grouping by multiple attributes", () => {
    const collection = CollectionModel.create()
    collection.addAttribute(data.attrFromID("aId"))
    collection.addAttribute(data.attrFromID("bId"))
    data.addCollection(collection)

    expect(collection.id).toBe("COLLtest-2")
    expect(data.collectionGroups.length).toBe(1)
    const aCases = data.getCasesForAttributes(["aId"])
    expect(aCases.length).toBe(9)
    expect(data.getCasesForCollection(collection.id)).toEqual(aCases)
    const bCases = data.getCasesForAttributes(["bId"])
    expect(bCases).toEqual(aCases)
    const cCases = data.getCasesForAttributes(["cId"])
    expect(cCases.length).toBe(27)
    const abcCases = data.getCasesForAttributes(["aId", "bId", "cId"])
    expect(abcCases.length).toBe(27)
  })

  it("handles multiple groupings", () => {
    const collection1 = CollectionModel.create()
    collection1.addAttribute(data.attrFromID("aId"))
    data.addCollection(collection1)
    expect(data.collectionGroups.length).toBe(1)
    const collection2 = CollectionModel.create()
    collection2.addAttribute(data.attrFromID("bId"))
    data.addCollection(collection2)

    expect(data.collectionGroups.length).toBe(2)
    const aCases = data.getCasesForAttributes(["aId"])
    expect(data.getCasesForCollection(collection1.id)).toEqual(aCases)
    expect(aCases.length).toBe(3)
    expect(aCases.map((c: any) => c.aId)).toEqual(["1", "2", "3"])
    const bCases = data.getCasesForAttributes(["bId"])
    expect(data.getCasesForCollection(collection2.id)).toEqual(bCases)
    expect(bCases.length).toBe(9)
    expect(bCases.map((c: any) => c.bId)).toEqual(["1", "2", "3", "1", "2", "3", "1", "2", "3"])
    const abCases = data.getCasesForAttributes(["aId", "bId"])
    expect(abCases.length).toBe(9)
    const cCases = data.getCasesForAttributes(["cId"])
    expect(cCases.length).toBe(27)
    const abcCases = data.getCasesForAttributes(["aId", "bId", "cId"])
    expect(abcCases.length).toBe(27)
  })

  it("handles moving attributes between collections", () => {
    expect(data.collectionGroups.length).toBe(0)
    // move attr "a" to a new collection
    data.moveAttributeToNewCollection("aId")
    const aCollection = data.collections.at(0)
    const aCases = data.getCasesForCollection(aCollection!.id)
    expect(data.getCasesForAttributes(["aId"])).toEqual(aCases)
    // move attr "b" to a new collection (parent to collection with "a")
    data.moveAttributeToNewCollection("bId", aCollection!.id)
    const bCollection = data.collections.at(0)
    expect(data.collections.length).toBe(2)
    // move attr "a" from its collection to the collection with "b",
    // leaving only the one collection with "a" and "b"
    data.setCollectionForAttribute(bCollection!.id, "aId", "bId")
    expect(data.collections.length).toBe(1)
    // move attr "b" to a new collection (child to collection with "a")
    data.moveAttributeToNewCollection("bId")
    expect(data.collections.length).toBe(2)
    const bCases = data.getCasesForCollection(bCollection!.id)
    expect(data.isCaseSelected(bCases[0].__id__)).toBe(false)
    // move attr "c" to collection with "b", leaving no un-grouped attributes
    // the child-most collection is then removed, leaving those attributes un-grouped
    data.setCollectionForAttribute(bCollection!.id, "cId")
    expect(data.collections.length).toBe(1)
  })
  it("sets values of all cases when setting values of pseudo-cases", () => {
    data.moveAttributeToNewCollection("aId")
    const pseudoCases = data.getCasesForAttributes(["aId"])
    const pseudoCase = { ...pseudoCases[0], aId: "4" }
    data.setCaseValues([pseudoCase])
    const collectionGroup = data.collectionGroups[0]
    for (const caseId of collectionGroup.groups[0].cases) {
      expect(data.getValue(caseId, "aId")).toBe("4")
    }
  })

  it("removes attributes from collections when they're removed from the data set", () => {
    data.moveAttributeToNewCollection("aId")
    expect(data.collections.length).toBe(1)
    const collection = data.collections.at(0)
    data.setCollectionForAttribute(collection!.id, "bId")
    data.removeAttribute("aId")
    expect(data.collections.length).toBe(1)
    data.removeAttribute("bId")
    expect(data.collections.length).toBe(0)
  })
})
