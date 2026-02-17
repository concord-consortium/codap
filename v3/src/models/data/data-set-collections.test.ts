import { types } from "mobx-state-tree"
import { ICollectionModel } from "./collection"
import { DataSet, IDataSet } from "./data-set"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/codap-utils", () => {
  const mockV3Id = () => `test-${++mockNodeIdCount}`
  return {
    ...jest.requireActual("../../utilities/codap-utils"),
    v3Id: mockV3Id,
    typeV3Id: () => types.optional(types.identifier, () => `${mockV3Id()}`)
  }
})

describe("DataSet collections", () => {

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

    return attrs
  }

  function noSymbols(obj: any) {
    // JSON.stringify-ing removes symbol-keyed properties
    return JSON.parse(JSON.stringify(obj))
  }

  it("handles ungrouped data", () => {
    expect(data.getCasesForCollection("foo")).toEqual([])
    const allCases = data.items.map(({ __id__ }) => ({ __id__: data.getItemChildCaseId(__id__) }))
    expect(noSymbols(data.getCasesForCollection(data.collections[0].id))).toEqual(allCases)
    expect(noSymbols(data.getCasesForAttributes(["aId"]))).toEqual(allCases)
    expect(noSymbols(data.getCasesForAttributes(["bId"]))).toEqual(allCases)
    expect(noSymbols(data.getCasesForAttributes(["cId"]))).toEqual(allCases)
    expect(data.collections.length).toEqual(1)
    expect(data.childCollection.attributes.map(attr => attr!.id)).toEqual(["aId", "bId", "cId"])
    // case caches are updated when cases are added/removed
    const childCases = data.childCases()
    expect(noSymbols(childCases)).toEqual(allCases)
    data.addCases([{ __id__: "4-5-6", aId: 4, bId: 5, cId: 6 }])
    data.validateCases()
    const allCases2 = data.items.map(({ __id__ }) => ({ __id__: data.getItemChildCaseId(__id__) }))
    expect(allCases2).not.toEqual(allCases)
    const childCases2 = data.childCases()
    expect(childCases2).not.toEqual(childCases)
    expect(noSymbols(childCases2)).toEqual(allCases2)
    data.removeCases(["4-5-6"])
    const allCases3 = data.items.map(({ __id__ }) => ({ __id__: data.getItemChildCaseId(__id__) }))
    const childCases3 = data.childCases()
    expect(childCases3).toEqual(childCases)
    expect(noSymbols(childCases3)).toEqual(allCases3)
  })

  it("handles grouping by a single attribute", () => {
    const collection = data.addCollection({ attributes: ["aId"] })
    expect(data.collections[0].attributes.map(attr => attr!.id)).toEqual(["aId"])
    expect(data.childCollection.attributes.map(attr => attr!.id)).toEqual(["bId", "cId"])

    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    expect(data.getCollection(collection.id)).toBe(collection)
    const aCases = data.getCasesForAttributes(["aId"])
    expect(data.getCasesForCollection(collection.id)).toEqual(aCases)
    expect(aCases.length).toBe(3)
    expect(aCases.map(aCase => data.getStrValue(aCase.__id__, "aId"))).toEqual(["1", "2", "3"])
    const abCases = data.getCasesForAttributes(["aId", "bId"])
    expect(abCases.length).toBe(27)
  })

  it("handles grouping by multiple attributes", () => {
    const collection: ICollectionModel = data.moveAttributeToNewCollection("aId")!
    data.moveAttribute("bId", { collection: collection.id })
    expect(data.collections[0].attributes.map(attr => attr!.id)).toEqual(["aId", "bId"])
    expect(data.childCollection.attributes.map(attr => attr!.id)).toEqual(["cId"])
    expect(attributesByCollection()).toEqual([["aId", "bId"], ["cId"]])

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
    const collection1 = data.addCollection({ attributes: ["aId"] })
    expect(data.collections.length).toBe(2)
    const collection2 = data.addCollection({ attributes: ["bId"] })
    expect(data.collections.length).toBe(3)
    expect(data.collections[0].attributes.map(attr => attr!.id)).toEqual(["aId"])
    expect(data.childCollection.attributes.map(attr => attr!.id)).toEqual(["cId"])
    expect(attributesByCollection()).toEqual([["aId"], ["bId"], ["cId"]])

    const aCases = data.getCasesForAttributes(["aId"])
    expect(data.getCasesForCollection(collection1.id)).toEqual(aCases)
    expect(aCases.length).toBe(3)
    expect(aCases.map(aCase => data.getStrValue(aCase.__id__, "aId"))).toEqual(["1", "2", "3"])
    const bCases = data.getCasesForAttributes(["bId"])
    expect(data.getCasesForCollection(collection2.id)).toEqual(bCases)
    expect(bCases.length).toBe(9)
    expect(bCases.map(aCase => data.getStrValue(aCase.__id__, "bId")))
      .toEqual(["1", "2", "3", "1", "2", "3", "1", "2", "3"])
    const abCases = data.getCasesForAttributes(["aId", "bId"])
    expect(abCases.length).toBe(9)
    const cCases = data.getCasesForAttributes(["cId"])
    expect(cCases.length).toBe(27)
    const abcCases = data.getCasesForAttributes(["aId", "bId", "cId"])
    expect(abcCases.length).toBe(27)

    // add another set of default cases
    addDefaultCases(b => 4)
    const _aCases = data.getCasesForAttributes(["aId"])
    expect(_aCases.map(aCase => data.getStrValue(aCase.__id__, "aId"))).toEqual(["1", "2", "3"])
    const _bCases = data.getCasesForAttributes(["bId"])
    expect(_bCases.map(aCase => data.getStrValue(aCase.__id__, "bId")))
      .toEqual(["1", "2", "3", "4", "1", "2", "3", "4", "1", "2", "3", "4"])
  })

  it("handles moving attributes between collections", () => {
    // move attr "a" to a new collection
    data.moveAttributeToNewCollection("aId")
    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    const aCases = data.getCasesForCollection(data.collections[0].id)
    expect(data.getCasesForAttributes(["aId"])).toEqual(aCases)
    // move attr "b" to a new collection (parent to collection with "a")
    data.moveAttributeToNewCollection("bId", data.collections[0].id)
    expect(attributesByCollection()).toEqual([["bId"], ["aId"], ["cId"]])
    expect(data.collections.length).toBe(3)
    // move attr "a" from its collection to the collection with "b",
    // leaving only the one collection with "a" and "b"
    data.moveAttribute("aId", { collection: data.collections[0].id, before: "bId" })
    expect(data.collections.length).toBe(2)
    expect(attributesByCollection()).toEqual([["aId", "bId"], ["cId"]])
    // move attr "b" to a new collection (child to collection with "a")
    data.moveAttributeToNewCollection("bId")
    expect(data.collections.length).toBe(3)
    expect(attributesByCollection()).toEqual([["aId"], ["bId"], ["cId"]])
    const bCases = data.getCasesForCollection(data.collections[1].id)
    expect(data.isCaseSelected(bCases[0].__id__)).toBe(false)
    // move attr "c" to collection with "b", leaving no un-grouped attributes
    // the child-most collection is then removed, leaving those attributes un-grouped
    data.moveAttribute("cId", { collection: data.collections[1].id })
    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    expect(data.collections.length).toBe(2)
    expect(data.collections[0].attributes.length).toBe(1)
    expect(data.collections[0].attributes[0]!.id).toBe("aId")
    // move attr "a" out of its collection back into data set
    data.moveAttribute("aId", { before: "bId"})
    expect(attributesByCollection()).toEqual([["aId", "bId", "cId"]])
    expect(data.collections.length).toBe(1)
    expect(data.attrIndexFromID("aId")).toBe(0)
    expect(data.attrIndexFromID("bId")).toBe(1)
    expect(data.attrIndexFromID("cId")).toBe(2)
  })

  it("selects all child cases when selecting a parent case", () => {
    data.moveAttributeToNewCollection("aId")
    const pseudoCases = data.getCasesForAttributes(["aId"])
    data.selectCases([pseudoCases[0].__id__])
    expect(data.selection.size).toBe(9)
    data.selectAll(false)
    expect(data.selection.size).toBe(0)
    data.setSelectedCases([pseudoCases[0].__id__])
    expect(data.selection.size).toBe(9)
  })

  it("sets values of all cases when setting values of parent cases", () => {
    data.moveAttributeToNewCollection("aId")
    const parentCases = data.getCasesForAttributes(["aId"])
    const parentCase = { ...parentCases[0], aId: "4" }
    data.setCaseValues([parentCase])
    for (const caseId of data.collections[0].caseGroups[0].childItemIds) {
      expect(data.getValue(caseId, "aId")).toBe(4)
    }
  })

  it("removes attributes from collections when they're removed from the data set", () => {
    data.moveAttributeToNewCollection("aId")
    expect(data.collections.length).toBe(2)
    const collection = data.collections[0]
    data.moveAttribute("bId", { collection: collection.id })
    data.removeAttribute("aId")
    expect(data.collections.length).toBe(2)
    data.removeAttribute("bId")
    expect(data.collections.length).toBe(1)
  })

  it("recovers correctly when addCases is called while cases are already invalidated", () => {
    // This simulates the undo scenario: removeCases triggers invalidateCases (via onPatch),
    // then addCases re-adds items. The INSERT path triggers another invalidateCases, but the
    // APPEND path calls validateCasesForNewItems which should early-return when isValidCases
    // is already false, deferring to the full rebuild.
    data.moveAttributeToNewCollection("aId")
    expect(data.collections.length).toBe(2)
    data.validateCases()
    const parentCollection = data.collections[0]
    const originalParentCaseCount = parentCollection.cases.length
    const originalChildCaseCount = data.childCollection.cases.length
    expect(originalParentCaseCount).toBe(3) // 3 groups by aId

    // remove some cases
    const casesToRemove = ["1-1-1", "1-1-2", "1-1-3"]
    data.removeCases(casesToRemove)
    data.validateCases()
    expect(data.childCollection.cases.length).toBe(originalChildCaseCount - casesToRemove.length)

    // now re-add them (simulating undo) — first invalidate, then add
    data.invalidateCases()
    data.addCases(casesToRemove.map(id => ({ __id__: id, aId: "1", bId: "1", cId: id.split("-")[2] })))
    // at this point isValidCases is still false; validateCasesForNewItems should have
    // early-returned without corrupting state
    expect(data.isValidCases).toBe(false)

    // full validation should produce correct results
    data.validateCases()
    expect(parentCollection.cases.length).toBe(originalParentCaseCount)
    expect(data.childCollection.cases.length).toBe(originalChildCaseCount)
  })

  it("doesn't take formula evaluated values into account when grouping", () => {
    const aAttr = data.attrFromID("aId")
    aAttr?.setDisplayExpression("foo * bar")
    data.moveAttributeToNewCollection("aId")
    expect(data.collections[0].attributes.map(attr => attr!.id)).toEqual(["aId"])
    expect(data.childCollection.attributes.map(attr => attr!.id)).toEqual(["bId", "cId"])
    expect(attributesByCollection()).toEqual([["aId"], ["bId", "cId"]])
    const aCases = data.getCasesForAttributes(["aId"])
    expect(aCases.length).toBe(1) // (!) without formula it'd be equal to 3
    expect(aCases.map(aCase => data.getStrValue(aCase.__id__, "aId"))).toEqual([""]) // formula needs to be re-evaluated
    const abCases = data.getCasesForAttributes(["aId", "bId"])
    expect(abCases.length).toBe(27)
  })
})
