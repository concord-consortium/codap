import { isEqual, isEqualWith } from "lodash"
import { applyAction, clone, destroy, getSnapshot, onAction } from "mobx-state-tree"
import {
  CaseID, DataSet, fromCanonical, ICase, ICaseFilter, ICaseID, IDataSet, toCanonical
} from "./data-set"

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

test("CaseID functionality", () => {
  const caseID = CaseID.create({ __id__: "0" })
  expect(caseID.__id__).toBeDefined()

  const copy = clone(caseID)
  expect(copy.__id__).toBe(caseID.__id__)

  const caseID2 = CaseID.create({})
  expect(caseID2.__id__).toBeDefined()
})

test("Canonicalization", () => {
  const ds = DataSet.create({ name: "data" })
  ds.addAttribute({ name: "str" })
  ds.addAttribute({ name: "num" })
  const strId = ds.attrIDFromName("str")
  const numId = ds.attrIDFromName("num")
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

test("DataSet basic functionality", () => {
  const dataset = DataSet.create({ name: "data" })
  expect(dataset.id).toBeDefined()

  expect(dataset.isInTransaction).toBe(false)
  dataset.beginTransaction()
  expect(dataset.isInTransaction).toBe(true)
  dataset.endTransaction()
  expect(dataset.isInTransaction).toBe(false)

  // add numeric attribute
  dataset.addAttribute({ name: "num" })
  const numAttr = dataset.attrFromName("num")
  const numAttrID = dataset.attributes[0].id
  expect(dataset.attributes.length).toBe(1)
  expect(numAttr?.id).toBe(numAttrID)
  expect(dataset.attributes[0].length).toBe(0)

  // add string attribute before numeric attribute
  dataset.addAttribute({ name: "str" }, numAttrID)
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
  dataset.setAttributeName("foo", "bar")

  // add/remove attribute
  dataset.addAttribute({ name: "redShirt" }, numAttrID)
  const redShirtID = dataset.attributes[1].id
  expect(dataset.attributes.length).toBe(3)
  const redShirt = dataset.attrFromID(redShirtID)
  expect(redShirt.name).toBe("redShirt")
  dataset.removeAttribute(redShirtID)
  expect(dataset.attributes.length).toBe(2)
  expect(dataset.attrFromID(redShirtID)).toBeUndefined()
  expect(dataset.attrFromName("redShirt")).toBeUndefined()
  dataset.addAttribute({ name: "goner" }, "bogus")
  expect(dataset.attributes.length).toBe(3)
  expect(dataset.attributes[2].name).toBe("goner")
  dataset.removeAttribute(dataset.attributes[2].id)
  // removing a non-existent attribute is a no-op
  dataset.removeAttribute("")
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
  // move attribute to bugus location moves it to end
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

  expect(dataset.getCase("")).toBeUndefined()
  dataset.setCaseValues([{ __id__: "" }])

  // adds cases without ids (and removes them)
  dataset.addCases(toCanonical(dataset, [{ str: "c", num: 3 }]))
  expect(dataset.cases.length).toBe(1)
  expect(dataset.getCaseAtIndex(0, { canonical: false })).toEqualExcludingIds({ str: "c", num: 3 })
  const mockConsoleWarn1 = jest.fn()
  const mockConsole1 = jest.spyOn(console, "warn").mockImplementation((...args: any[]) => mockConsoleWarn1(...args))
  expect(dataset.getCaseAtIndex(1)).toBeUndefined()
  expect(mockConsoleWarn1).toHaveBeenCalledTimes(1)
  mockConsole1.mockRestore()
  expect(dataset.getValue("bogus", "bogus")).toBeUndefined()
  expect(dataset.getValueAtIndex(-1, "bogus")).toBeUndefined()
  expect(dataset.getNumeric("bogus", "bogus")).toBeUndefined()
  expect(dataset.getNumericAtIndex(-1, "bogus")).toBeUndefined()
  // adding a case "before" a non-existent case appends the case to the end
  dataset.addCases(toCanonical(dataset, [{ str: "d", num: 4 }]), { before: "bogus" })
  expect(dataset.cases.length).toBe(2)
  expect(dataset.getCaseAtIndex(1, { canonical: false })).toEqualExcludingIds({ str: "d", num: 4 })
  dataset.removeCases([dataset.cases[0].__id__, dataset.cases[1].__id__])

  // add new case
  dataset.addCases(toCanonical(dataset, [{ str: "d", num: 4 }]))
  expect(dataset.getCaseAtIndex(0)).toEqualExcludingIds({ [strAttrID]: "d", [numAttrID]: 4 })
  const caseD4ID = dataset.cases[0].__id__
  expect(dataset.caseIDFromIndex(0)).toBe(caseD4ID)
  expect(dataset.caseIDFromIndex(-1)).toBeUndefined()
  expect(dataset.getCaseAtIndex(-1)).toBeUndefined()
  expect(dataset.getCaseAtIndex(0, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.getCase(caseD4ID, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.cases.length).toBe(1)
  expect(caseD4ID).toBeDefined()
  expect(dataset.attributes[0].value(0)).toBe("d")
  expect(dataset.attributes[1].value(0)).toBe("4")
  expect(dataset.attributes[1].numeric(0)).toBe(4)
  expect(dataset.getNumeric(caseD4ID, numAttrID)).toBe(4)
  expect(dataset.getNumericAtIndex(0, numAttrID)).toBe(4)
  expect(dataset.getValueAtIndex(0, numAttrID)).toBe("4")

  // add new case before first case
  dataset.addCases(toCanonical(dataset, [{ str: "c", num: 3 }]), { before: caseD4ID })
  const caseC3ID = dataset.cases[0].__id__
  expect(dataset.cases.length).toBe(2)
  expect(caseC3ID).toBeDefined()
  expect(caseC3ID).not.toBe(caseD4ID)
  expect(dataset.caseIDFromIndex(0)).toBe(caseC3ID)
  expect(dataset.nextCaseID("")).toBeUndefined()
  expect(dataset.nextCaseID(caseC3ID)).toBe(caseD4ID)
  expect(dataset.cases[1].__id__).toBe(caseD4ID)
  expect(dataset.attributes[0].value(0)).toBe("c")
  expect(dataset.attributes[1].value(0)).toBe("3")
  expect(dataset.attributes[1].numeric(0)).toBe(3)
  expect(dataset.getNumeric(caseC3ID, numAttrID)).toBe(3)
  expect(dataset.getNumericAtIndex(0, numAttrID)).toBe(3)
  expect(dataset.getValueAtIndex(0, numAttrID)).toBe("3")

  // add multiple new cases
  dataset.addCases(toCanonical(dataset, [{ str: "a", num: 1 }, { str: "b", num: 2 }]), { before: caseC3ID })
  const caseA1ID = dataset.cases[0].__id__,
        caseB2ID = dataset.cases[1].__id__
  expect(dataset.cases.length).toBe(4)
  expect(dataset.attributes[0].value(0)).toBe("a")
  expect(dataset.attributes[1].value(0)).toBe("1")
  expect(dataset.attributes[0].value(1)).toBe("b")
  expect(dataset.attributes[1].value(1)).toBe("2")
  expect(dataset.getValue(caseA1ID, "foo")).toBeUndefined()
  expect(dataset.getValue("foo", "bar")).toBeUndefined()
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "a", num: 1 })
  expect(dataset.getCase(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "b", num: 2 })
  expect(dataset.getCase(caseA1ID, { canonical: true }))
    .toEqual({ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 })
  expect(dataset.getCase(caseB2ID, { canonical: true }))
    .toEqual({ __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 })
  expect(dataset.getCases([caseA1ID, caseB2ID], { canonical: true }))
    .toEqual([{ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 },
              { __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 }])
  expect(dataset.getCasesAtIndex().length).toBe(4)
  expect(dataset.getCasesAtIndex(2).length).toBe(2)
  // add null/undefined values
  dataset.addCases(toCanonical(dataset, [{ str: undefined }]))
  const nullCaseID = dataset.cases[dataset.cases.length - 1].__id__
  expect(dataset.getCase(nullCaseID, { canonical: false }))
    .toEqual({ __id__: nullCaseID, str: "", num: "" })
  expect(dataset.getCases([""], { canonical: true })).toEqual([])
  // validate that caseIDMap is correct
  dataset.cases.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__)
    expect((caseIndex >= 0) ? dataset.cases[caseIndex].__id__ : "").toBe(aCase.__id__)
  })

  // setCaseValues
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, str: "A", num: 10 }]))
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseB2ID, str: "B", num: 20 },
                                              { __id__: caseC3ID, str: "C", num: 30 }]))
  expect(dataset.getValue(caseB2ID, strAttrID)).toBe("B")
  expect(dataset.getValue(caseB2ID, numAttrID)).toBe("20")
  expect(dataset.getCase(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(dataset.getValue(caseC3ID, strAttrID)).toBe("C")
  expect(dataset.getValue(caseC3ID, numAttrID)).toBe("30")
  const mockConsoleWarn = jest.fn()
  const consoleSpy = jest.spyOn(console, "warn").mockImplementation((...args: any[]) => mockConsoleWarn(...args))
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, foo: "bar" }]))
  expect(mockConsoleWarn).toHaveBeenCalledTimes(1)
  consoleSpy.mockRestore()
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, num: undefined }]))
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: "" })

  const cases = dataset.getCases([caseB2ID, caseC3ID, ""], { canonical: false })
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
  expect(copy.cases.length).toBe(dataset.cases.length)

  dataset.removeCases([nullCaseID])
  expect(dataset.cases.length).toBe(4)
  dataset.removeCases([caseA1ID, caseB2ID])
  expect(dataset.cases.length).toBe(2)
  // validate that caseIDMap is correct
  dataset.cases.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__)
    expect((caseIndex >= 0) ? dataset.cases[caseIndex].__id__ : "").toBe(aCase.__id__)
  })
  dataset.removeCases([""])
  expect(dataset.cases.length).toBe(2)
  destroy(dataset)
})

test("Canonical case functionality", () => {
  const dataset = DataSet.create({
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
  const caseD4ID = dataset.cases[0].__id__
  expect(dataset.getCaseAtIndex(-1)).toBeUndefined()
  expect(dataset.getCaseAtIndex(0, { canonical: true }))
    .toEqual({ __id__: caseD4ID, [strAttrID]: "d", [numAttrID]: 4 })
  expect(dataset.getCaseAtIndex(0, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.getCase(caseD4ID, { canonical: false })).toEqual({ __id__: caseD4ID, str: "d", num: 4 })
  expect(dataset.cases.length).toBe(1)
  expect(caseD4ID).toBeDefined()
  expect(dataset.attributes[0].value(0)).toBe("d")
  expect(dataset.attributes[1].value(0)).toBe("4")

  // add new case before first case
  dataset.addCases([{ [strAttrID]: "c", [numAttrID]: 3 }], { before: caseD4ID })
  const caseC3ID = dataset.cases[0].__id__
  expect(dataset.cases.length).toBe(2)
  expect(caseC3ID).toBeDefined()
  expect(caseC3ID).not.toBe(caseD4ID)
  expect(dataset.nextCaseID("")).toBeUndefined()
  expect(dataset.nextCaseID(caseC3ID)).toBe(caseD4ID)
  expect(dataset.cases[1].__id__).toBe(caseD4ID)
  expect(dataset.attributes[0].value(0)).toBe("c")
  expect(dataset.attributes[1].value(0)).toBe("3")

  // add multiple new cases
  dataset.addCases([{ [strAttrID]: "a", [numAttrID]: 1 },
                    { [strAttrID]: "b", [numAttrID]: 2 }], { before: caseC3ID })
  const caseA1ID = dataset.cases[0].__id__,
        caseB2ID = dataset.cases[1].__id__
  expect(dataset.cases.length).toBe(4)
  expect(dataset.attributes[0].value(0)).toBe("a")
  expect(dataset.attributes[1].numeric(0)).toBe(1)
  expect(dataset.attributes[0].value(1)).toBe("b")
  expect(dataset.attributes[1].numeric(1)).toBe(2)
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "a", num: 1 })
  expect(dataset.getCase(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "b", num: 2 })
  expect(dataset.getCase(caseA1ID, { canonical: true }))
    .toEqual({ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 })
  expect(dataset.getCase(caseB2ID, { canonical: true }))
    .toEqual({ __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 })
  expect(dataset.getCases([caseA1ID, caseB2ID], { canonical: true }))
    .toEqual([{ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 },
              { __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 }])
  expect(dataset.getCasesAtIndex(0, { count: 2, canonical: true }))
    .toEqual([{ __id__: caseA1ID, [strAttrID]: "a", [numAttrID]: 1 },
              { __id__: caseB2ID, [strAttrID]: "b", [numAttrID]: 2 }])
  expect(dataset.getCaseAtIndex(-1, { canonical: true })).toBeUndefined()
  expect(dataset.getCasesAtIndex(undefined, { canonical: true }).length).toBe(4)
  expect(dataset.getCasesAtIndex(2, { canonical: true }).length).toBe(2)
  // add null/undefined values
  dataset.addCases([{ [strAttrID]: undefined }])
  // add invalid cases
  const nullCaseID = dataset.cases[dataset.cases.length - 1].__id__
  expect(dataset.getCase(nullCaseID, { canonical: false }))
    .toEqual({ __id__: nullCaseID, str: "", num: "" })
  expect(dataset.getCases([""], { canonical: true })).toEqual([])
  // validate that caseIDMap is correct
  dataset.cases.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__)
    expect((caseIndex >= 0) ? dataset.cases[caseIndex].__id__ : "").toBe(aCase.__id__)
  })
  dataset.addCases([{ __id__: "12345", [strAttrID]: "e", [numAttrID]: 5 }])
  dataset.removeCases(["12345"])

  // setCanonicalCaseValues
  dataset.setCaseValues([{ __id__: caseA1ID, [strAttrID]: "A", [numAttrID]: 10 }])
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues([{ __id__: caseB2ID, [strAttrID]: "B", [numAttrID]: 20 },
                         { __id__: caseC3ID, [strAttrID]: "C", [numAttrID]: 30 }])
  expect(dataset.getCase(caseB2ID, { canonical: false })).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(dataset.getValue(caseC3ID, strAttrID)).toBe("C")
  expect(dataset.getNumeric(caseC3ID, numAttrID)).toBe(30)
  const mockConsoleWarn = jest.fn()
  const consoleSpy = jest.spyOn(console, "warn").mockImplementation((...args: any[]) => mockConsoleWarn(...args))
  dataset.setCaseValues(toCanonical(dataset, [{ __id__: caseA1ID, foo: "bar" }]))
  expect(mockConsoleWarn).toHaveBeenCalledTimes(1)
  consoleSpy.mockRestore()
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: 10 })
  dataset.setCaseValues([{ __id__: caseA1ID, [numAttrID]: undefined }])
  expect(dataset.getCase(caseA1ID, { canonical: false })).toEqual({ __id__: caseA1ID, str: "A", num: "" })

  const cases = dataset.getCases([caseB2ID, caseC3ID, ""], { canonical: false })
  expect(cases.length).toBe(2)
  expect(cases[0]).toEqual({ __id__: caseB2ID, str: "B", num: 20 })
  expect(cases[1]).toEqual({ __id__: caseC3ID, str: "C", num: 30 })

  dataset.removeCases([nullCaseID])
  expect(dataset.cases.length).toBe(4)
  dataset.removeCases([caseA1ID, caseB2ID])
  expect(dataset.cases.length).toBe(2)
  // validate that caseIDMap is correct
  dataset.cases.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__)
    expect((caseIndex >= 0) ? dataset.cases[caseIndex].__id__ : "").toBe(aCase.__id__)
  })
  dataset.removeCases([""])
  expect(dataset.cases.length).toBe(2)
  destroy(dataset)
})

test("DataSet case selection", () => {
  const ds = DataSet.create({ name: "data" })
  ds.addCases([{__id__: "c1"}, {__id__: "c2"}, {__id__: "c3"}, {__id__: "c4"}, {__id__: "c5"}])
  expect(ds.cases.length).toBe(5)
  expect(ds.cases.map(c => ds.isCaseSelected(c.__id__))).toEqual([false, false, false, false, false])
  ds.selectCases(["c1", "c4"])
  expect(ds.cases.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, false, false, true, false])
  ds.selectAll(false)
  expect(ds.cases.map(c => ds.isCaseSelected(c.__id__))).toEqual([false, false, false, false, false])
  ds.selectAll(true)
  expect(ds.cases.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, true, true, true, true])
  ds.selectCases(["c1", "c4"], false)
  expect(ds.cases.map(c => ds.isCaseSelected(c.__id__))).toEqual([false, true, true, false, true])
  ds.setSelectedCases(["c1", "c4"])
  expect(ds.cases.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, false, false, true, false])
  ds.selectAll()
  expect(ds.cases.map(c => ds.isCaseSelected(c.__id__))).toEqual([true, true, true, true, true])
})

test("Derived DataSet functionality", () => {
  const dataset = DataSet.create({ name: "data" })

  // add attributes and cases
  dataset.addAttribute({ name: "str" })
  dataset.addAttribute({ name: "num" })
  const strAttrID = dataset.attributes[0].id
  dataset.addCases(toCanonical(dataset, [{ str: "a", num: 1 }, { str: "b", num: 2 }, { str: "c", num: 3 }]))

  const derived = dataset.derive("derived")
  expect(derived.name).toBe("derived")
  expect(derived.attributes.length).toBe(2)
  expect(derived.cases.length).toBe(3)
  const derivedCase0ID = derived.cases[0].__id__,
        derivedCase1ID = derived.cases[1].__id__,
        derivedCases = derived.getCases([derivedCase0ID, derivedCase1ID], { canonical: false })
  expect(derivedCases[0]).toEqual({ __id__: derivedCase0ID, str: "a", num: 1 })
  expect(derivedCases[1]).toEqual({ __id__: derivedCase1ID, str: "b", num: 2 })

  const derived2 = dataset.derive("derived2", { attributeIDs: [strAttrID, ""] })
  expect(derived2.name).toBe("derived2")
  expect(derived2.attributes.length).toBe(1)
  expect(derived.cases.length).toBe(3)
  const derived2Case0ID = derived2.cases[0].__id__,
        derived2Case1ID = derived2.cases[1].__id__,
        derived2Cases = derived2.getCases([derived2Case0ID, derived2Case1ID], { canonical: false })
  expect(derived2Cases[0]).toEqual({ __id__: derived2Case0ID, str: "a" })
  expect(derived2Cases[1]).toEqual({ __id__: derived2Case1ID, str: "b" })

  const filter: ICaseFilter = (attrID, aCase) => {
          const id = attrID("num")
          const num = id && aCase?.[id]
          return (num != null) && (num >= 3) ? aCase : undefined
        },
        derived3 = dataset.derive("derived3", { filter })
  expect(derived3.name).toBe("derived3")
  expect(derived3.attributes.length).toBe(2)
  expect(derived3.cases.length).toBe(1)
  const derived3Case0ID = derived3.cases[0].__id__,
        derived3Cases = derived3.getCases([derived3Case0ID], { canonical: false })
  expect(derived3Cases[0]).toEqual({ __id__: derived3Case0ID, str: "c", num: 3 })

  const derived4 = dataset.derive()
  expect(derived4.name).toBe("data")
})

function createDataSet(name: string) {
  const ds = DataSet.create({ name })
  // add attributes and cases
  ds.addAttribute({ name: "str" })
  ds.addAttribute({ name: "num" })
  ds.addCases(toCanonical(ds, [{ str: "a", num: 1 },
                               { str: "b", num: 2 },
                               { str: "c", num: 3 },
                               { str: "d", num: 4 },
                               { str: "e", num: 5 }]))
  return ds
}

function createOdds(source: IDataSet) {
  const numAttr = source.attrFromName("num"),
        numAttrID = numAttr?.id || ""
  return source.derive("odds", {
                        attributeIDs: [numAttrID],
                        filter: (attrID: (name: string) => string, aCase: ICase) => {
                          const id = attrID("num")
                          const num: number = id && Number(aCase?.[id]) || 0
                          return num % 2 ? aCase : undefined
                        },
                        synchronize: true
                      })
}

function createEvens(source: IDataSet) {
  return source.derive("evens", {
                        filter: (attrID: (name: string) => string, aCase: ICase) => {
                          const id = attrID("num")
                          const num: number = id && Number(aCase?.[id]) || 0
                          return num % 2 === 0 ? aCase : undefined
                        },
                        synchronize: true
                      })
}

test("Derived DataSet synchronization (subset attributes)", () => {
  const source = createDataSet("source"),
        odds = createOdds(source)

  expect(odds.attributes.length).toBe(1)

  const bCaseID = source.cases[1].__id__,
        cCaseID = source.cases[2].__id__,
        dCaseID = source.cases[3].__id__,
        eCaseID = source.cases[4].__id__
  let abCaseID: string,
      cdCaseID: string,
      gCaseID: string
  source.addAttribute({ name: "foo" })
  const fooAttrID = source.attributes[2].id

  return odds.onSynchronized()
    .then(() => {
      expect(odds.isSynchronizing).toBe(false)
      expect(odds.attributes.length).toBe(1)

      source.removeAttribute(fooAttrID)
      return odds.onSynchronized()
    })
    .then(() => {
      expect(odds.attributes.length).toBe(1)

      source.addCases(toCanonical(source, [{ str: "f", num: 6 }, { str: "g", num: 7 }]))
      gCaseID = source.cases[6].__id__
      return odds.onSynchronized()
    })
    .then(() => {
      expect(odds.cases.length).toBe(4)
      expect(odds.getCase(gCaseID, { canonical: false })).toEqual({ __id__: gCaseID, num: 7 })

      source.addCases(toCanonical(source, [{ str: "ab", num: -3 }, { str: "cd", num: -1 }]),
                      { before: [bCaseID, dCaseID] })
      abCaseID = source.cases[1].__id__
      expect(source.getCase(abCaseID, { canonical: false })).toEqual({ __id__: abCaseID, str: "ab", num: -3 })
      cdCaseID = source.cases[4].__id__
      expect(source.getCase(cdCaseID, { canonical: false })).toEqual({ __id__: cdCaseID, str: "cd", num: -1 })
      return odds.onSynchronized()
    })
    .then(() => {
      expect(odds.cases.length).toBe(6)
      expect(odds.getCase(abCaseID, { canonical: false })).toEqual({ __id__: abCaseID, num: -3 })
      expect(odds.nextCaseID(abCaseID)).toBe(cCaseID)
      expect(odds.getCase(cdCaseID, { canonical: false })).toEqual({ __id__: cdCaseID, num: -1 })
      expect(odds.nextCaseID(cdCaseID)).toBe(eCaseID)
      // setCaseValues: changing odd value to even should result in removing case
      source.setCaseValues(toCanonical(source, [{ __id__: cCaseID, num: 2 }]))
      return odds.onSynchronized()
    })
    .then(() => {
      expect(odds.cases.length).toBe(5)
      source.setCaseValues(toCanonical(source, [{ __id__: cCaseID, num: 3 }]))
      return odds.onSynchronized()
    })
    .then(() => {
      expect(odds.cases.length).toBe(6)
      expect(odds.nextCaseID(cCaseID)).toBe(cdCaseID)
      source.setCaseValues(toCanonical(source, [{ __id__: bCaseID, num: 3 }, { __id__: dCaseID, num: 5 }]))
      return odds.onSynchronized()
    })
    .then(() => {
      expect(odds.cases.length).toBe(8)
      expect(odds.nextCaseID(bCaseID)).toBe(cCaseID)
      expect(odds.nextCaseID(dCaseID)).toBe(eCaseID)
      return odds.onSynchronized()
    })
    .then(() => {
      // test destruction
      destroy(odds)
    })
})

test("Derived DataSet synchronization (all attributes)", () => {
  const source = createDataSet("source"),
        evens = createEvens(source),
        bCaseID = evens.cases[1].__id__

  expect(evens.attributes.length).toBe(2)

  let a1CaseID: string, a2CaseID
  source.addAttribute({ name: "foo" })
  const fooAttrID = source.attributes[2].id

  return evens.onSynchronized()
    .then(() => {
      expect(evens.isSynchronizing).toBe(false)
      expect(evens.attributes.length).toBe(3)

      source.removeAttribute(fooAttrID)
      return evens.onSynchronized()
    })
    .then(() => {
      expect(evens.attributes.length).toBe(2)

      source.addCases(toCanonical(source, [{ str: "a1", num: -4 }, { str: "a2", num: -2 }]), { before: bCaseID })
      return evens.onSynchronized()
    })
    .then(() => {
      expect(evens.cases.length).toBe(4)
      a1CaseID = evens.cases[1].__id__
      a2CaseID = evens.cases[2].__id__
      expect(evens.getCase(a1CaseID, { canonical: false })).toEqual({ __id__: a1CaseID, str: "a1", num: -4 })
      expect(evens.nextCaseID(a1CaseID)).toBe(a2CaseID)
      expect(evens.getCase(a2CaseID, { canonical: false })).toEqual({ __id__: a2CaseID, str: "a2", num: -2 })
      expect(evens.nextCaseID(a2CaseID)).toBe(bCaseID)
      return evens.onSynchronized()
    })
    .then(() => {
      // test invalid setCaseValues handling
      source.setCaseValues([{} as ICase])
      // test invalid setCanonicalCaseValues handling
      source.setCaseValues([{} as ICase])
      // test multiple setCaseValues
      source.setCaseValues(toCanonical(source, [{ __id__: a1CaseID, num: -3 }]))
      source.setCaseValues(toCanonical(source, [{ __id__: a1CaseID, num: -2 }]))
      return evens.onSynchronized()
    })
    .then(() => {
      // test destruction
      destroy(evens)
    })
})

test("Derived DataSet synchronization (no filter)", () => {
  const source = createDataSet("source"),
        derived = source.derive("derived", { synchronize: true })

  source.addCases(toCanonical(source, [{ str: "g", num: 7 }]))
  expect(source.cases.length).toBe(6)
  let fCaseID: string
  const gCaseID = source.cases[5].__id__
  return derived.onSynchronized()
    .then(() => {
      expect(derived.cases.length).toBe(6)
      expect(derived.getCase(gCaseID, { canonical: false })).toEqual({ __id__: gCaseID, str: "g", num: 7 })
      source.addCases(toCanonical(source, [{ str: "f", num: 7 }]), { before: gCaseID })
      fCaseID = source.cases[5].__id__
      return derived.onSynchronized()
    })
    .then(() => {
      expect(derived.cases.length).toBe(7)
      expect(derived.getCaseAtIndex(5, { canonical: false })).toEqual({ __id__: fCaseID, str: "f", num: 7 })
      source.setCaseValues(toCanonical(source, [{ __id__: fCaseID, num: 6 }]))
      return derived.onSynchronized()
    })
    .then(() => {
      expect(derived.getCase(fCaseID, { canonical: false })).toEqual({ __id__: fCaseID, str: "f", num: 6 })
      destroy(derived)
    })
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
        expect(getSnapshot(dst2)).toEqual(getSnapshot(dst))
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
