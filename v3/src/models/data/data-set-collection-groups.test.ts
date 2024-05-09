import { types } from "mobx-state-tree"
import { CollectionModel } from "./collection"
import { DataSet, IDataSet } from "./data-set"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  typedId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))
jest.mock("../../utilities/mst-utils", () => {
  const mockCodapId = () => `test-${++mockNodeIdCount}`
  return {
    ...jest.requireActual("../../utilities/mst-utils"),
    codapNumIdStr: mockCodapId,
    typeCodapNumIdStr: () => types.optional(types.identifier, () => `${mockCodapId()}`)
  }
})

describe("CollectionGroups", () => {

  let data: IDataSet

  function addDefaultCases(bFn: (b: number) => number = b => b) {
    for (let a = 1; a <= 3; ++a) {
      for (let b = 1; b<= 3; ++b) {
        const _b = bFn(b)
        for (let c = 1; c <= 3; ++c) {
          data.addCases([{ __id__: `${a}-${_b}-${c}`, aId: `${a}`, bId: `${_b}`, cId: `${c}` }])
        }
      }
    }
  }

  beforeEach(() => {
    mockNodeIdCount = 0

    data = DataSet.create()
    data.addAttribute({ id: "aId", name: "a" })
    data.addAttribute({ id: "bId", name: "b" })
    data.addAttribute({ id: "cId", name: "c" })
    addDefaultCases()
  })

  function attributesByCollection() : string[][] {
    const attrs: string[][] = []

    data.collections.forEach(collection => {
      attrs.push(collection.attributes.map(attr => attr!.id))
    })
    attrs.push(data.ungroupedAttributes.map(attr => attr.id))

    return attrs
  }

  it("handles ungrouped data", () => {
    expect(data.collectionGroups).toEqual([])
    expect(data.getCasesForCollection("foo")).toEqual(data.cases)
    expect(data.getCasesForAttributes(["aId"])).toEqual(data.cases)
    expect(data.getCasesForAttributes(["bId"])).toEqual(data.cases)
    expect(data.getCasesForAttributes(["cId"])).toEqual(data.cases)
    expect(data.groupedAttributes).toEqual([])
    expect(data.ungroupedAttributes.map(attr => attr.id)).toEqual(["aId", "bId", "cId"])
    // case caches are updated when cases are added/removed
    const allCases = data.cases.map(({ __id__ }) => ({ __id__ }))
    const childCases = data.childCases()
    expect(childCases).toEqual(allCases)
    data.addCases([{ __id__: "4-5-6", aId: 4, bId: 5, cId: 6 }])
    const allCases2 = data.cases.map(({ __id__ }) => ({ __id__ }))
    expect(allCases2).not.toEqual(allCases)
    const childCases2 = data.childCases()
    expect(childCases2).not.toEqual(childCases)
    expect(childCases2).toEqual(allCases2)
    data.removeCases(["4-5-6"])
    const allCases3 = data.cases.map(({ __id__ }) => ({ __id__ }))
    const childCases3 = data.childCases()
    expect(childCases3).toEqual(childCases)
    expect(childCases3).toEqual(allCases3)
  })

  it("handles grouping by a single attribute", () => {
    const collection = CollectionModel.create()
    collection.addAttribute(data.attrFromID("aId")!)
    data.addCollection(collection)
    expect(data.groupedAttributes.map(attr => attr.id)).toEqual(["aId"])
    expect(data.ungroupedAttributes.map(attr => attr.id)).toEqual(["bId", "cId"])

    expect(collection.id).toBe("test-3")
    expect(data.collectionGroups.length).toBe(1)
    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    expect(data.getGroupedCollection(collection.id)).toBe(collection)
    const aCases = data.getCasesForAttributes(["aId"])
    expect(data.getCasesForCollection(collection.id)).toEqual(aCases)
    expect(aCases.length).toBe(3)
    expect(aCases.map((c: any) => c.aId)).toEqual(["1", "2", "3"])
    const abCases = data.getCasesForAttributes(["aId", "bId"])
    expect(abCases.length).toBe(27)
  })

  it("handles grouping by multiple attributes", () => {
    const collection = CollectionModel.create()
    collection.addAttribute(data.attrFromID("aId")!)
    collection.addAttribute(data.attrFromID("bId")!)
    data.addCollection(collection)
    expect(data.groupedAttributes.map(attr => attr.id)).toEqual(["aId", "bId"])
    expect(data.ungroupedAttributes.map(attr => attr.id)).toEqual(["cId"])
    expect(attributesByCollection()).toEqual([["aId", "bId"], ["cId"]])

    expect(collection.id).toBe("test-3")
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
    collection1.addAttribute(data.attrFromID("aId")!)
    data.addCollection(collection1)
    expect(data.collectionGroups.length).toBe(1)
    const collection2 = CollectionModel.create()
    collection2.addAttribute(data.attrFromID("bId")!)
    data.addCollection(collection2)
    expect(data.groupedAttributes.map(attr => attr.id)).toEqual(["aId", "bId"])
    expect(data.ungroupedAttributes.map(attr => attr.id)).toEqual(["cId"])
    expect(attributesByCollection()).toEqual([["aId"], ["bId"], ["cId"]])

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

    // add another set of default cases
    addDefaultCases(b => 4)
    const _aCases = data.getCasesForAttributes(["aId"])
    expect(_aCases.map((c: any) => c.aId)).toEqual(["1", "2", "3"])
    const _bCases = data.getCasesForAttributes(["bId"])
    expect(_bCases.map((c: any) => c.bId)).toEqual(["1", "2", "3", "4", "1", "2", "3", "4", "1", "2", "3", "4"])
  })

  it("handles moving attributes between collections", () => {
    expect(data.collectionGroups.length).toBe(0)
    // move attr "a" to a new collection
    data.moveAttributeToNewCollection("aId")
    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    const aCases = data.getCasesForCollection(data.collections[0].id)
    expect(data.getCasesForAttributes(["aId"])).toEqual(aCases)
    // move attr "b" to a new collection (parent to collection with "a")
    data.moveAttributeToNewCollection("bId", data.collections[0].id)
    expect(attributesByCollection()).toEqual([["bId"], ["aId"], ["cId"]])
    expect(data.collections.length).toBe(2)
    // move attr "a" from its collection to the collection with "b",
    // leaving only the one collection with "a" and "b"
    data.setCollectionForAttribute("aId", { collection: data.collections[0].id, before: "bId" })
    expect(data.collections.length).toBe(1)
    expect(attributesByCollection()).toEqual([["aId", "bId"], ["cId"]])
    // move attr "b" to a new collection (child to collection with "a")
    data.moveAttributeToNewCollection("bId")
    expect(data.collections.length).toBe(2)
    expect(attributesByCollection()).toEqual([["aId"], ["bId"], ["cId"]])
    const bCases = data.getCasesForCollection(data.collections[1].id)
    expect(data.isCaseSelected(bCases[0].__id__)).toBe(false)
    // move attr "c" to collection with "b", leaving no un-grouped attributes
    // the child-most collection is then removed, leaving those attributes un-grouped
    data.setCollectionForAttribute("cId", { collection: data.collections[1].id })
    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    expect(data.collections.length).toBe(1)
    expect(data.collections[0].attributes.length).toBe(1)
    expect(data.collections[0].attributes[0]!.id).toBe("aId")
    // move attr "a" out of its collection back into data set
    data.setCollectionForAttribute("aId", { before: "bId"})
    expect(attributesByCollection()).toEqual([["aId", "bId", "cId"]])
    expect(data.collections.length).toBe(0)
    expect(data.attrIndexFromID("aId")).toBe(0)
    expect(data.attrIndexFromID("bId")).toBe(1)
    expect(data.attrIndexFromID("cId")).toBe(2)
  })

  it("selects all child cases when selecting a parent/pseudo-case", () => {
    data.moveAttributeToNewCollection("aId")
    const pseudoCases = data.getCasesForAttributes(["aId"])
    data.selectCases([pseudoCases[0].__id__])
    expect(data.selection.size).toBe(9)
    data.selectAll(false)
    expect(data.selection.size).toBe(0)
    data.setSelectedCases([pseudoCases[0].__id__])
    expect(data.selection.size).toBe(9)
  })

  it("sets values of all cases when setting values of pseudo-cases", () => {
    data.moveAttributeToNewCollection("aId")
    const pseudoCases = data.getCasesForAttributes(["aId"])
    const pseudoCase = { ...pseudoCases[0], aId: "4" }
    data.setCaseValues([pseudoCase])
    const collectionGroup = data.collectionGroups[0]
    for (const caseId of collectionGroup.groups[0].childCaseIds) {
      expect(data.getValue(caseId, "aId")).toBe("4")
    }
  })

  it("removes attributes from collections when they're removed from the data set", () => {
    data.moveAttributeToNewCollection("aId")
    expect(data.collections.length).toBe(1)
    const collection = data.collections[0]
    data.setCollectionForAttribute("bId", { collection: collection.id })
    data.removeAttribute("aId")
    expect(data.collections.length).toBe(1)
    data.removeAttribute("bId")
    expect(data.collections.length).toBe(0)
  })

  it("doesn't take formula evaluated values into account when grouping", () => {
    const aAttr = data.attrFromID("aId")
    aAttr?.setDisplayExpression("foo * bar")
    data.moveAttributeToNewCollection("aId")
    expect(data.groupedAttributes.map(attr => attr.id)).toEqual(["aId"])
    expect(data.ungroupedAttributes.map(attr => attr.id)).toEqual(["bId", "cId"])
    expect(data.collectionGroups.length).toBe(1)
    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    const aCases = data.getCasesForAttributes(["aId"])
    expect(aCases.length).toBe(1) // (!) without formula it'd be equal to 3
    expect(aCases.map((c: any) => c.aId)).toEqual([""]) // formula needs to be re-evaluated
    const abCases = data.getCasesForAttributes(["aId", "bId"])
    expect(abCases.length).toBe(27)
  })
})
