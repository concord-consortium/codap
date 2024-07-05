import { isEqual, isEqualWith } from "lodash"
import { applyAction, clone, destroy, getSnapshot, onAction, onSnapshot } from "mobx-state-tree"
import { uniqueName } from "../../utilities/js-utils"
import { IAttributeSnapshot } from "./attribute"
import { ICollectionModelSnapshot } from "./collection"
import { DataSet, fromCanonical, toCanonical } from "./data-set"
import { createDataSet } from "./data-set-conversion"
import { ICaseID } from "./data-set-types"

let message = () => ""

// for use with lodash's isEqualWith function to implement toEqualWithUniqueIds custom jest matcher
const customizer = (rec: any, exp: any) => {
  if (Array.isArray(rec) && Array.isArray(exp) && (rec?.length !== exp?.length)) {
    message = () =>
      `array lengths must be equal\n` +
      `  Expected: ${exp.length}\n` +
      `  Received: ${rec.length}`
    return false
  }
  if ((typeof rec === "object") && (typeof exp === "object") &&
      ((typeof rec.id === "string") || (typeof rec.__id__ === "string") ||
       (typeof exp.id === "string") || (typeof exp.__id__ === "string"))) {
    const { id: recId, __id__: recCaseId, ...recOthers } = rec
    const { id: expId, __id__: expCaseId, ...expOthers } = exp
    if (!isEqual(recOthers, expOthers)) {
      message = () => `objects must match after excluding ids:\n` +
                      `  expected: ${JSON.stringify(expOthers)}\n` +
                      `  received: ${JSON.stringify(recOthers)}`
      return false
    }
    return true
  }
}

// custom jest matcher for testing that copied objects are identical to the originals
// except for the object ids which should all be different.
expect.extend({
  toEqualExcludingIds(received: any, expected: any) {
    message = () => ""
    const pass = isEqualWith(received, expected, customizer)
    if (!pass && !message()) {
      message = () => "values differed outside of matched objects"
    }
    return { pass, message }
  }
})
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualExcludingIds(expected: any): R
    }
  }
}

test("Canonicalization", () => {
  const ds = DataSet.create({ name: "data" })
  ds.addAttribute({ name: "str" })
  ds.addAttribute({ name: "num" })
  const strId = ds.attrIDFromName("str")!
  const numId = ds.attrIDFromName("num")!
  const a1Case = { str: "a", num: "1" }
  const a1Canonical = { [strId]: "a", [numId]: "1" }
  expect(toCanonical(ds, a1Case)).toEqual(a1Canonical)
  expect(toCanonical(ds, [a1Case])).toEqual([a1Canonical])
  expect(fromCanonical(ds, a1Canonical)).toEqual(a1Case)
  expect(fromCanonical(ds, [a1Canonical])).toEqual([a1Case])
  const a1CaseWithId = { __id__: "a1", ...a1Case }
  const a1CanonicalWithId = { __id__: "a1", ...a1Canonical }
  expect(toCanonical(ds, a1CaseWithId)).toEqual(a1CanonicalWithId)
  expect(toCanonical(ds, [a1CaseWithId])).toEqual([a1CanonicalWithId])
  expect(fromCanonical(ds, a1CanonicalWithId)).toEqual(a1CaseWithId)
  expect(fromCanonical(ds, [a1CanonicalWithId])).toEqual([a1CaseWithId])

  // attributes that can't be de-canonicalized are just returned
  expect(fromCanonical(ds, { foo: "bar", ...a1Canonical })).toEqual({ foo: "bar", ...a1Case })
  // attributes that can't be canonicalized result in console.warning
  const mockConsoleWarn = jest.fn()
  const mockConsole = jest.spyOn(console, "warn").mockImplementation((...args: any[]) => mockConsoleWarn(...args))
  expect(toCanonical(ds, { foo: "bar", ...a1Case })).toEqual(a1Canonical)
  expect(mockConsoleWarn).toHaveBeenCalledTimes(1)
  mockConsole.mockRestore()
})

test("DataSet original flat snapshot conversion", () => {
  const ungrouped: ICollectionModelSnapshot = { name: "Ungrouped" }
  const attributes: IAttributeSnapshot[] = [
    { name: "a1" },
    { name: "a2" },
    { name: "a3" }
  ]
  const data = DataSet.create({
    name: "Data",
    ungrouped,
    attributes
  } as any)
  expect(data.collections.length).toBe(1)
  expect(data.childCollection.name).toBe("Ungrouped")
  expect(data.attributesMap.size).toBe(3)
  expect(data.attributes.length).toBe(3)
})

test("DataSet original hierarchical snapshot conversion", () => {
  const ungrouped: ICollectionModelSnapshot = { name: "Ungrouped" }
  const attributes: IAttributeSnapshot[] = [
    { id: "a1Id", name: "a1" },
    { id: "a2Id", name: "a2" },
    { id: "a3Id", name: "a3" }
  ]
  const collections: ICollectionModelSnapshot[] = [
    { name: "Collection1", attributes: ["a1Id"] }
  ]
  const data = DataSet.create({
    name: "Data",
    collections,
    ungrouped,
    attributes
  } as any)
  expect(data.collections.length).toBe(2)
  expect(data.collections[0].attributes.length).toBe(1)
  expect(data.childCollection.name).toBe("Ungrouped")
  expect(data.childCollection.attributes.length).toBe(2)
  expect(data.attributesMap.size).toBe(3)
  expect(data.attributes.length).toBe(3)
})

test("DataSet temporary flat snapshot conversion", () => {
  const attributes: string[] = ["a1Id", "a2Id", "a3Id"]
  const data = DataSet.create({
    name: "Data",
    attributesMap: {
      a1Id: { id: "a1Id", name: "a1" },
      a2Id: { id: "a2Id", name: "a2" },
      a3Id: { id: "a3Id", name: "a3" }
    },
    attributes
  } as any)
  expect(data.attributesMap.size).toBe(3)
  expect(data.attributes.length).toBe(3)
})

test("DataSet volatile caching", () => {
  const data = DataSet.create({ name: "data" })
  expect(data.isValidCaseGroups).toBe(false)
  data.setValidCaseGroups()
  expect(data.isValidCaseGroups).toBe(true)
  data.invalidateCaseGroups()
  expect(data.isValidCaseGroups).toBe(false)
})

test("DataSet basic functionality", () => {
  const dataset = DataSet.create({ name: "data" })
  expect(dataset.id).toBeDefined()

  expect(dataset.name).toBe("data")
  dataset.setName("name")
  expect(dataset.name).toBe("name")
  expect(dataset.sourceName).toBeUndefined()
  dataset.setSourceName("sourceName")
  expect(dataset.sourceName).toBe("sourceName")
  expect(dataset.importDate).toBeUndefined()
  dataset.setImportDate("2023")
  expect(dataset.importDate).toBe("2023")
  expect(dataset.description).toBeUndefined()
  dataset.setDescription("description")
  expect(dataset.description).toBe("description")

  expect(dataset.isInTransaction).toBe(false)
  dataset.beginTransaction()
  expect(dataset.isInTransaction).toBe(true)
  dataset.endTransaction()
  expect(dataset.isInTransaction).toBe(false)

  expect(dataset.getAttribute("foo")).toBeUndefined()
  expect(dataset.getAttributeByName("foo")).toBeUndefined()

  // add numeric attribute
  dataset.addAttribute({ name: "num" })
  const numAttr = dataset.attrFromName("num")
  const numAttrID = dataset.attributes[0].id
  expect(dataset.attributes.length).toBe(1)
  expect(numAttr?.id).toBe(numAttrID)
  expect(dataset.attributes[0].length).toBe(0)
  expect(dataset.getAttribute(numAttrID)).toBe(numAttr)
  expect(dataset.getAttributeByName("num")).toBe(numAttr)

  // add string attribute before numeric attribute
  dataset.addAttribute({ name: "str" }, { before: numAttrID })
  let strAttr = dataset.attrFromName("str")
  const strAttrID = dataset.attributes[0].id
  expect(dataset.attributes.length).toBe(2)
  expect(strAttr?.id).toBe(strAttrID)
  expect(dataset.attributes[0].length).toBe(0)
  expect(dataset.attributes[0].name).toBe("str")
  expect(dataset.attributes[1].name).toBe("num")

  // rename attribute
  dataset.setAttributeName(strAttrID, "str2")
  expect(dataset.attributes[0].name).toBe("str2")
  dataset.setAttributeName(strAttrID, "str")
  expect(dataset.attributes[0].name).toBe("str")

  // non-unique attribute name when string is passed
  dataset.setAttributeName(strAttrID, "pool")
  expect(dataset.attributes[0].name).toBe("pool")
  dataset.addAttribute({ name: "loop" })
  const loopAttr = dataset.attrFromName("loop")
  const loopAttrID = dataset.attributes[2].id
  expect(loopAttr?.name).toBe("loop")
  dataset.setAttributeName(loopAttrID, "pool")
  expect(dataset.attributes[2].name).toBe("pool")

  // unique attribute name when function is passed
  const isValid = (aName: string) => !dataset.attributes.find(attr => aName === attr.name)
  dataset.setAttributeName(loopAttrID, ()=>uniqueName("pool", isValid))
  expect(dataset.attributes[2].name).toBe("pool2")
  dataset.removeAttribute(loopAttrID)
  dataset.setAttributeName(strAttrID, "str")
  dataset.setAttributeName("foo", "bar")

  // add/remove attribute
  dataset.addAttribute({ name: "redShirt" }, { before: numAttrID })
  const redShirtID = dataset.attributes[1].id
  expect(dataset.attributesMap.size).toBe(3)
  expect(dataset.attributes.length).toBe(3)
  const redShirt = dataset.attrFromID(redShirtID)
  expect(redShirt?.name).toBe("redShirt")
  dataset.removeAttribute(redShirtID)
  expect(dataset.attributesMap.size).toBe(2)
  expect(dataset.attributes.length).toBe(2)
  expect(dataset.attrFromID(redShirtID)).toBeUndefined()
  expect(dataset.attrFromName("redShirt")).toBeUndefined()
  dataset.addAttribute({ name: "goner" }, { before: "bogus" })
  expect(dataset.attributesMap.size).toBe(3)
  expect(dataset.attributes.length).toBe(3)
  expect(dataset.attributes[2].name).toBe("goner")
  dataset.removeAttribute(dataset.attributes[2].id)
  // removing a non-existent attribute is a no-op
  dataset.removeAttribute("")
  expect(dataset.attributesMap.size).toBe(2)
  expect(dataset.attributes.length).toBe(2)

  // move first attribute to the end
  dataset.moveAttribute(strAttrID)
  expect(dataset.attributes[0].name).toBe("num")
  expect(dataset.attributes[1].name).toBe("str")
  // move second attribute before the first
  dataset.moveAttribute(strAttrID, { before: numAttrID })
  expect(dataset.attributes[0].name).toBe("str")
  expect(dataset.attributes[1].name).toBe("num")
  // move first attribute after the second
  dataset.moveAttribute(strAttrID, { after: numAttrID })
  expect(dataset.attributes[0].name).toBe("num")
  expect(dataset.attributes[1].name).toBe("str")
  // move attribute to bogus location moves it to end
  dataset.moveAttribute(numAttrID, { after: "bogus" })
  expect(dataset.attributes[0].name).toBe("str")
  expect(dataset.attributes[1].name).toBe("num")
  // moving a non-existent attribute is a no-op
  dataset.moveAttribute("")
  expect(dataset.attributes[0].name).toBe("str")
  expect(dataset.attributes[1].name).toBe("num")

  strAttr = dataset.attrFromName("str")
  expect(strAttr?.id).toBe(strAttrID)

  // validate attribute indices
  dataset.attributes.forEach((attr, index) => {
    expect(dataset.attrIndexFromID(attr.id)).toBe(index)
  })

  expect(dataset.getItem("")).toBeUndefined()
  dataset.setCaseValues([{ __id__: "" }])

  // adds cases without ids (and removes them)
  dataset.addCases(toCanonical(dataset, [{ str: "c", num: 3 }]))
  expect(dataset.items.length).toBe(1)
  expect(dataset.getItemAtIndex(0, { canonical: false })).toEqualExcludingIds({ str: "c", num: 3 })
  const mockConsoleWarn1 = jest.fn()
  const mockConsole1 = jest.spyOn(console, "warn").mockImplementation((...args: any[]) => mockConsoleWarn1(...args))
  expect(dataset.getItemAtIndex(1)).toBeUndefined()
  // MobX 6.7.0 no longer warns about out-of-range array accesses
  expect(mockConsoleWarn1).toHaveBeenCalledTimes(0)
  mockConsole1.mockRestore()
  expect(dataset.getValue("bogus", "bogus")).toBeUndefined()
  expect(dataset.getValueAtIndex(-1, "bogus")).toBeUndefined()
  expect(dataset.getStrValue("bogus", "bogus")).toBe("")
  expect(dataset.getStrValueAtIndex(-1, "bogus")).toBe("")
  expect(dataset.getNumeric("bogus", "bogus")).toBeUndefined()
  expect(dataset.getNumericAtIndex(-1, "bogus")).toBeUndefined()
  // adding a case "before" a non-existent case appends the case to the end
  dataset.addCases(toCanonical(dataset, [{ str: "d", num: 4 }]), { before: "bogus" })
  expect(dataset.items.length).toBe(2)
  expect(dataset.getItemAtIndex(1, { canonical: false })).toEqualExcludingIds({ str: "d", num: 4 })
  dataset.removeCases([dataset.items[0].__id__, dataset.items[1].__id__])

  // add new case
  dataset.addCases(toCanonical(dataset, [{ str: "d", num: 4 }]))
  expect(dataset.getItemAtIndex(0)).toEqualExcludingIds({ [strAttrID]: "d", [numAttrID]: 4 })
  const caseD4ID = dataset.items[0].__id__
  expect(dataset.caseIDFromIndex(0)).toBe(caseD4ID)
  expect(dataset.caseIDFromIndex(-1)).toBeUndefined()
  expect(dataset.getItemAtIndex(-1)).toBeUndefined()
  expect(dataset.getItemAtIndex(0, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.getItem(caseD4ID, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.items.length).toBe(1)
  expect(caseD4ID).toBeDefined()
  expect(dataset.attributes[0].value(0)).toBe("d")
  expect(dataset.attributes[1].value(0)).toBe("4")
  expect(dataset.attributes[1].numeric(0)).toBe(4)
  expect(dataset.getNumeric(caseD4ID, numAttrID)).toBe(4)
  expect(dataset.getNumericAtIndex(0, numAttrID)).toBe(4)
  expect(dataset.getValueAtIndex(0, numAttrID)).toBe("4")
  expect(dataset.getStrValueAtIndex(0, numAttrID)).toBe("4")

  // add new case before first case
  dataset.addCases([{ str: "c", num: 3 }], { before: caseD4ID, canonicalize: true })
  const caseC3ID = dataset.items[0].__id__
  expect(dataset.items.length).toBe(2)
  expect(caseC3ID).toBeDefined()
  expect(caseC3ID).not.toBe(caseD4ID)
  expect(dataset.caseIDFromIndex(0)).toBe(caseC3ID)
  expect(dataset.nextCaseID("")).toBeUndefined()
  expect(dataset.nextCaseID(caseC3ID)).toBe(caseD4ID)
  expect(dataset.items[1].__id__).toBe(caseD4ID)
  expect(dataset.attributes[0].value(0)).toBe("c")
  expect(dataset.attributes[1].value(0)).toBe("3")
  expect(dataset.attributes[1].numeric(0)).toBe(3)
  expect(dataset.getNumeric(caseC3ID, numAttrID)).toBe(3)
  expect(dataset.getNumericAtIndex(0, numAttrID)).toBe(3)
  expect(dataset.getValueAtIndex(0, numAttrID)).toBe("3")

  // add multiple new cases before specified case
  dataset.addCases([{ str: "a", num: 1 }, { str: "b", num: 2 }], { before: caseC3ID, canonicalize: true })
  const caseA1ID = dataset.items[0].__id__,
        caseB2ID = dataset.items[1].__id__
  expect(dataset.items.length).toBe(4)
  expect(dataset.attributes[0].value(0)).toBe("a")
  expect(dataset.attributes[1].value(0)).toBe("1")
  expect(dataset.attributes[0].value(1)).toBe("b")
  expect(dataset.attributes[1].value(1)).toBe("2")
  expect(dataset.getValue(caseA1ID, "foo")).toBeUndefined()
  expect(dataset.getValue("foo", "bar")).toBeUndefined()
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "a", num: 1 })
  expect(dataset.getItem(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "b", num: 2 })
  expect(dataset.getItem(caseA1ID, { canonical: true }))
    .toEqual({ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 })
  expect(dataset.getItem(caseB2ID, { canonical: true }))
    .toEqual({ __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 })
  expect(dataset.getItems([caseA1ID, caseB2ID], { canonical: true }))
    .toEqual([{ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 },
              { __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 }])
  expect(dataset.getCasesAtIndex().length).toBe(4)
  expect(dataset.getCasesAtIndex(2).length).toBe(2)
  // add null/undefined values
  dataset.addCases(toCanonical(dataset, [{ str: undefined }]))
  const nullCaseID = dataset.items[dataset.items.length - 1].__id__
  expect(dataset.getItem(nullCaseID, { canonical: false }))
    .toEqual({ __id__: nullCaseID, str: "", num: "" })
  expect(dataset.getItems([""], { canonical: true })).toEqual([])
  // validate that caseIDMap is correct
  dataset.items.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__) ?? -1
    expect((caseIndex >= 0) ? dataset.items[caseIndex].__id__ : "").toBe(aCase.__id__)
  })

  // add multiple new cases after specified case
  dataset.addCases([{ str: "j", num: 1 }, { str: "k", num: 2 }], { after: caseC3ID, canonicalize: true })
  const caseJ1ID = dataset.items[3].__id__,
        caseK2ID = dataset.items[4].__id__
  expect(dataset.items.length).toBe(7)
  expect(dataset.attributes[0].value(3)).toBe("j")
  expect(dataset.attributes[1].value(3)).toBe("1")
  expect(dataset.attributes[0].value(4)).toBe("k")
  expect(dataset.attributes[1].value(4)).toBe("2")
  expect(dataset.getValue(caseJ1ID, "foo")).toBeUndefined()
  expect(dataset.getValue("foo", "bar")).toBeUndefined()
  expect(dataset.getItem(caseJ1ID, { canonical: false })).toEqual({ __id__: caseJ1ID, str: "j", num: 1 })
  expect(dataset.getItem(caseK2ID, { canonical: false })).toEqual({ __id__: caseK2ID, str: "k", num: 2 })
  expect(dataset.getItem(caseJ1ID, { canonical: true }))
    .toEqual({ __id__: caseJ1ID, [strAttrID]: "j", [numAttrID]: 1 })
  expect(dataset.getItem(caseK2ID, { canonical: true }))
    .toEqual({ __id__: caseK2ID, [strAttrID]: "k", [numAttrID]: 2 })
  expect(dataset.getItems([caseJ1ID, caseK2ID], { canonical: true }))
    .toEqual([{ __id__: caseJ1ID, [strAttrID]: "j", [numAttrID]: 1 },
              { __id__: caseK2ID, [strAttrID]: "k", [numAttrID]: 2 }])
  expect(dataset.getCasesAtIndex().length).toBe(7)
  expect(dataset.getCasesAtIndex(4).length).toBe(3)

  // setCaseValues
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, str: "A", num: 10 }]))
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseB2ID, str: "B", num: 20 },
                                              { __id__: caseC3ID, str: "C", num: 30 }]))
  expect(dataset.getValue(caseB2ID, strAttrID)).toBe("B")
  expect(dataset.getValue(caseB2ID, numAttrID)).toBe("20")
  expect(dataset.getItem(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(dataset.getValue(caseC3ID, strAttrID)).toBe("C")
  expect(dataset.getValue(caseC3ID, numAttrID)).toBe("30")
  const mockConsoleWarn = jest.fn()
  const consoleSpy = jest.spyOn(console, "warn").mockImplementation((...args: any[]) => mockConsoleWarn(...args))
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, foo: "bar" }]))
  expect(mockConsoleWarn).toHaveBeenCalledTimes(1)
  consoleSpy.mockRestore()
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, num: undefined }]))
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: "" })

  const cases = dataset.getItems([caseB2ID, caseC3ID, ""], { canonical: false })
  expect(cases.length).toBe(2)
  expect(cases[0]).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(cases[1]).toEqual({ __id__: caseC3ID, str: "C", num: 30 })

  // const bIndex = dataset.caseIndexFromID(caseB2ID);
  // const cases2 = dataset.getCasesAtIndices(bIndex, 2);
  expect(cases.length).toBe(2)
  expect(cases[0]).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(cases[1]).toEqual({ __id__: caseC3ID, str: "C", num: 30 })

  const copy = clone(dataset)
  expect(copy.id).toBe(dataset.id)
  expect(copy.name).toBe(dataset.name)
  copy.setName("copy")
  expect(copy.name).toBe("copy")
  expect(copy.attributes.length).toBe(dataset.attributes.length)
  expect(copy.items.length).toBe(dataset.items.length)

  dataset.removeCases([nullCaseID])
  expect(dataset.items.length).toBe(6)
  dataset.removeCases([caseA1ID, caseB2ID])
  expect(dataset.items.length).toBe(4)
  // validate that caseIDMap is correct
  dataset.items.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__) ?? -1
    expect((caseIndex >= 0) ? dataset.items[caseIndex].__id__ : "").toBe(aCase.__id__)
  })
  dataset.removeCases([""])
  expect(dataset.items.length).toBe(4)
  destroy(dataset)
})

test("hierarchical collection support", () => {
  const data = DataSet.create({ name: "data" })
  expect(data.id).toBeDefined()

  expect(data.collections.length).toBe(1)
  expect(data.collectionIds).toEqual([data.childCollection.id])
  expect(data.collections).toEqual([data.childCollection])
  expect(data.childCollection.name).toBe("Cases")

  const parentCollection = data.addCollection({ name: "ParentCollection" })
  const parentCollectionId = parentCollection.id
  expect(data.collectionIds).toEqual([parentCollection.id, data.childCollection.id])
  expect(data.collections).toEqual([parentCollection, data.childCollection])
  expect(data.getParentCollection(data.childCollection.id)).toBe(parentCollection)
  expect(data.getParentCollection(parentCollection.id)).toBeUndefined()
  expect(data.getChildCollection(parentCollection.id)).toBe(data.childCollection)
  expect(data.getChildCollection(data.childCollection.id)).toBeUndefined()

  const childAttr = data.addAttribute({ name: "childAttr" })
  const parentAttr = data.addAttribute({ name: "parentAttr" }, { collection: parentCollectionId })
  expect(parentCollection.getAttribute(childAttr.id)).toBeUndefined()
  expect(parentCollection.getAttribute(parentAttr.id)).toBe(parentAttr)
  
  // Names must be unique
  const parentCollection2 = data.addCollection({ name: "ParentCollection" })
  expect(parentCollection2.name).toBe("ParentCollection1")

  destroy(data)
  jestSpyConsole("warn", spy => {
    data.getCollection(parentCollectionId)
    expect(spy).toHaveBeenCalledTimes(1)

    data.getCollectionByName("ParentCollection")
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

test("Canonical case functionality", () => {
  const dataset = createDataSet({
                    name: "data",
                    attributes: [{ name: "str" }, { name: "num" }]
                  }),
        strAttrID = dataset.attributes[0].id,
        numAttrID = dataset.attributes[1].id

  // validate attribute indices
  dataset.attributes.forEach((attr, index) => {
    expect(dataset.attrIndexFromID(attr.id)).toBe(index)
  })
  expect(dataset.attrIndexFromID("foo")).toBeUndefined()

  // add new case
  dataset.addCases([{ [strAttrID]: "d", [numAttrID]: 4 }])
  const caseD4ID = dataset.items[0].__id__
  expect(dataset.getItemAtIndex(-1)).toBeUndefined()
  expect(dataset.getItemAtIndex(0, { canonical: true }))
    .toEqual({ __id__: caseD4ID, [strAttrID]: "d", [numAttrID]: 4 })
  expect(dataset.getItemAtIndex(0, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.getItem(caseD4ID, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.items.length).toBe(1)
  expect(caseD4ID).toBeDefined()
  expect(dataset.attributes[0].value(0)).toBe("d")
  expect(dataset.attributes[1].value(0)).toBe("4")

  // add new case before first case
  dataset.addCases([{ [strAttrID]: "c", [numAttrID]: 3 }], { before: caseD4ID })
  const caseC3ID = dataset.items[0].__id__
  expect(dataset.items.length).toBe(2)
  expect(caseC3ID).toBeDefined()
  expect(caseC3ID).not.toBe(caseD4ID)
  expect(dataset.nextCaseID("")).toBeUndefined()
  expect(dataset.nextCaseID(caseC3ID)).toBe(caseD4ID)
  expect(dataset.items[1].__id__).toBe(caseD4ID)
  expect(dataset.attributes[0].value(0)).toBe("c")
  expect(dataset.attributes[1].value(0)).toBe("3")

  // add multiple new cases
  dataset.addCases([{ [strAttrID]: "a", [numAttrID]: 1 },
                    { [strAttrID]: "b", [numAttrID]: 2 }], { before: caseC3ID })
  const caseA1ID = dataset.items[0].__id__,
        caseB2ID = dataset.items[1].__id__
  expect(dataset.items.length).toBe(4)
  expect(dataset.attributes[0].value(0)).toBe("a")
  expect(dataset.attributes[1].numeric(0)).toBe(1)
  expect(dataset.attributes[0].value(1)).toBe("b")
  expect(dataset.attributes[1].numeric(1)).toBe(2)
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "a", num: 1 })
  expect(dataset.getItem(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "b", num: 2 })
  expect(dataset.getItem(caseA1ID, { canonical: true }))
    .toEqual({ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 })
  expect(dataset.getItem(caseB2ID, { canonical: true }))
    .toEqual({ __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 })
  expect(dataset.getItems([caseA1ID, caseB2ID], { canonical: true }))
    .toEqual([{ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 },
              { __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 }])
  expect(dataset.getCasesAtIndex(0, { count: 2, canonical: true }))
    .toEqual([{ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 },
              { __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 }])
  expect(dataset.getItemAtIndex(-1, { canonical: true })).toBeUndefined()
  expect(dataset.getCasesAtIndex(undefined, { canonical: true }).length).toBe(4)
  expect(dataset.getCasesAtIndex(2, { canonical: true }).length).toBe(2)
  // add null/undefined values
  dataset.addCases([{ [strAttrID]: undefined }])
  // add invalid cases
  const nullCaseID = dataset.items[dataset.items.length - 1].__id__
  expect(dataset.getItem(nullCaseID, { canonical: false }))
    .toEqual({ __id__: nullCaseID, str: "", num: "" })
  expect(dataset.getItems([""], { canonical: true })).toEqual([])
  // validate that caseIDMap is correct
  dataset.items.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__) ?? -1
    expect((caseIndex >= 0) ? dataset.items[caseIndex].__id__ : "").toBe(aCase.__id__)
  })
  dataset.addCases([{ __id__: "12345", [strAttrID]: "e", [numAttrID]: 5 }])
  dataset.removeCases(["12345"])

  // setCanonicalCaseValues
  dataset.setCaseValues([{ __id__: caseA1ID, [strAttrID]: "A", [numAttrID]: 10 }])
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues([{ __id__: caseB2ID, [strAttrID]: "B", [numAttrID]: 20 },
                         { __id__: caseC3ID, [strAttrID]: "C", [numAttrID]: 30 }])
  expect(dataset.getItem(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(dataset.getValue(caseC3ID, strAttrID)).toBe("C")
  expect(dataset.getStrValue(caseC3ID, strAttrID)).toBe("C")
  expect(dataset.getNumeric(caseC3ID, numAttrID)).toBe(30)
  const mockConsoleWarn = jest.fn()
  const consoleSpy = jest.spyOn(console, "warn").mockImplementation((...args: any[]) => mockConsoleWarn(...args))
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, foo: "bar" }]))
  expect(mockConsoleWarn).toHaveBeenCalledTimes(1)
  consoleSpy.mockRestore()
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues([{ __id__: caseA1ID, [numAttrID]: undefined }])
  expect(dataset.getItem(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: "" })

  const cases = dataset.getItems([caseB2ID, caseC3ID, ""], { canonical: false })
  expect(cases.length).toBe(2)
  expect(cases[0]).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(cases[1]).toEqual({ __id__: caseC3ID, str: "C", num: 30 })

  dataset.removeCases([nullCaseID])
  expect(dataset.items.length).toBe(4)
  dataset.removeCases([caseA1ID, caseB2ID])
  expect(dataset.items.length).toBe(2)
  // validate that caseIDMap is correct
  dataset.items.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__) ?? -1
    expect((caseIndex >= 0) ? dataset.items[caseIndex].__id__ : "").toBe(aCase.__id__)
  })
  dataset.removeCases([""])
  expect(dataset.items.length).toBe(2)
  destroy(dataset)
})

test("DataSet case selection", () => {
  const ds = DataSet.create({ name: "data" })
  ds.addCases([{__id__: "c1"}, {__id__: "c2"}, {__id__: "c3"}, {__id__: "c4"}, {__id__: "c5"}])
  expect(ds.items.length).toBe(5)
  expect(ds.items.map(c => ds.isCaseSelected(c.__id__))).toEqual([false, false, false, false, false])
  ds.selectCases(["c1", "c4"])
  expect(ds.items.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, false, false, true, false])
  ds.selectAll(false)
  expect(ds.items.map(c => ds.isCaseSelected(c.__id__))).toEqual([false, false, false, false, false])
  ds.selectAll(true)
  expect(ds.items.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, true, true, true, true])
  ds.selectCases(["c1", "c4"], false)
  expect(ds.items.map(c => ds.isCaseSelected(c.__id__))).toEqual([false, true, true, false, true])
  ds.setSelectedCases(["c1", "c4"])
  expect(ds.items.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, false, false, true, false])
  ds.selectAll()
  expect(ds.items.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, true, true, true, true])
})

test("Caching mode", () => {
  const ds = DataSet.create({ name: "data" })

  // add attributes and cases
  ds.addAttribute({ name: "str" })
  ds.addAttribute({ name: "num" })
  // const strAttrID = ds.attributes[0].id
  const numAttrID = ds.attributes[1].id
  ds.addCases(toCanonical(ds, [{ str: "a", num: 1 }, { str: "b", num: 2 }, { str: "c", num: 3 }]))
  const aId = ds.items[0].__id__
  // const bId = ds.cases[1].__id__
  // const cId = ds.cases[2].__id__

  expect(ds.isCaching()).toBe(false)
  ds.beginCaching()
  expect(ds.isCaching()).toBe(true)

  const actionHandler = jest.fn()
  const snapshotHandler = jest.fn()
  onAction(ds, () => actionHandler())
  onSnapshot(ds, () => snapshotHandler())
  ds.setCaseValues([{ __id__: aId, [numAttrID]: -1 }])
  expect(actionHandler).toHaveBeenCalledTimes(1)
  expect(snapshotHandler).not.toHaveBeenCalled()
  expect(ds.caseCache.get(aId)?.[numAttrID]).toBe(-1)
  expect(ds.getValue(aId, numAttrID)).toBe(-1)
  expect(ds.getStrValue(aId, numAttrID)).toBe("-1")
  expect(ds.getNumeric(aId, numAttrID)).toBe(-1)

  ds.endCaching(true)
  expect(ds.isCaching()).toBe(false)
})

test("snapshot processing", () => {
  const ds = DataSet.create({ name: "data" })

  // add attributes and cases
  ds.addAttribute({ name: "str" })
  ds.addAttribute({ name: "num" })
  // const strAttrID = ds.attributes[0].id
  ds.addCases(toCanonical(ds, [{ str: "a", num: 1 }, { str: "b", num: 2 }, { str: "c", num: 3 }]))

  ds.prepareSnapshot()
  const snap = getSnapshot(ds)
  ds.completeSnapshot()
  // TODO: validate the snapshot
  expect(snap).toBeDefined()
})

test("DataSet client synchronization", (done) => {
  const src = DataSet.create({ name: "source" }),
        dst = clone(src),
        dst2 = clone(dst)
  let srcActionCount = 0,
      dstActionCount = 0
  // should initially be equivalent
  expect(getSnapshot(src)).toEqual(getSnapshot(dst))
  expect(getSnapshot(dst)).toEqual(getSnapshot(dst2))
  // keep dst in sync with src
  onAction(src, (action) => {
    ++srcActionCount
    // have to use setTimeout otherwise subsequent actions don't trigger
    // perhaps the code that suppresses actions within actions
    setTimeout(() => {
      --srcActionCount
      applyAction(dst, action)
      if ((srcActionCount <= 0) && (dstActionCount <= 0)) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(getSnapshot(dst)).toEqual(getSnapshot(src))
        done()
      }
    })
  })
  // keep dst2 in sync with dst
  onAction(dst, (action) => {
    ++dstActionCount
    setTimeout(() => {
      --dstActionCount
      applyAction(dst2, action)
      if ((srcActionCount <= 0) && (dstActionCount <= 0)) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(getSnapshot(dst2)).toEqualWithoutIds(getSnapshot(dst))
        done()
      }
    })
  })

  src.addAttribute({ name: "str" })
  src.addAttribute({ name: "num" })
  src.addCases(toCanonical(src, [{ str: "a", num: 1 }]))
  src.addCases(toCanonical(src, [{ str: "b", num: 2 }, { str: "c", num: 3 }]))
  src.removeAttribute(src.attributes[0].id)
})

test("DataSet collection helpers", () => {
  const ds = DataSet.create({ name: "data" })
  ds.addAttribute({ name: "attr1" })
  ds.addAttribute({ name: "attr2" })
  expect(ds.collections.length).toBe(1)
  ds.moveAttributeToNewCollection(ds.attributes[0].id)
  expect(ds.collections.length).toBe(2)

  // Test collection helpers using the actual, grouped collection (instance of CollectionModel).
  expect(ds.getCollection(ds.collections[0].id)).toBeDefined()
  expect(ds.getCollectionIndex(ds.collections[0].id)).toEqual(0)
  expect(ds.getCollectionForAttribute(ds.attributes[0].id)).toBe(ds.collections[0])
  expect(ds.getCollectionByName(ds.collections[0].name)).toBeDefined()

  // Test collection helpers using the the ungrouped collection stand-in. It's not considered be a grouped collection,
  // but other collection-related helpers handle it as expected.
  expect(ds.getCollection(ds.childCollection.id)).toBeDefined()
  expect(ds.getCollectionIndex(ds.childCollection.id)).toEqual(1)
  expect(ds.getCollectionForAttribute(ds.attributes[1].id)).toBe(ds.childCollection)

  expect(ds.getCollectionForAttribute("non-existent-attr-ID")).toBeUndefined()
})
