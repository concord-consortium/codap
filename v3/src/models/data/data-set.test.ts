import { isEqual, isEqualWith } from "lodash"
import { applyAction, clone, destroy, getSnapshot, onAction, onSnapshot } from "mobx-state-tree"
import { uniqueName } from "../../utilities/js-utils"
import { DataSet, fromCanonical, toCanonical } from "./data-set"
import { CaseID, ICaseID } from "./data-set-types"

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
  // MobX 6.7.0 no longer warns about out-of-range array accesses
  expect(mockConsoleWarn1).toHaveBeenCalledTimes(0)
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

  // add multiple new cases before specified case
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

   // add multiple new cases after specified case
   dataset.addCases(toCanonical(dataset, [{ str: "j", num: 1 }, { str: "k", num: 2 }]), { after: caseC3ID })
   const caseJ1ID = dataset.cases[4].__id__,
         caseK2ID = dataset.cases[3].__id__
   expect(dataset.cases.length).toBe(7)
   expect(dataset.attributes[0].value(4)).toBe("j")
   expect(dataset.attributes[1].value(4)).toBe("1")
   expect(dataset.attributes[0].value(3)).toBe("k")
   expect(dataset.attributes[1].value(3)).toBe("2")
   expect(dataset.getValue(caseJ1ID, "foo")).toBeUndefined()
   expect(dataset.getValue("foo", "bar")).toBeUndefined()
   expect(dataset.getCase(caseJ1ID, { canonical: false })).toEqual({ __id__: caseJ1ID, str: "j", num: 1 })
   expect(dataset.getCase(caseK2ID, { canonical: false })).toEqual({ __id__: caseK2ID, str: "k", num: 2 })
   expect(dataset.getCase(caseJ1ID, { canonical: true }))
     .toEqual({ __id__: caseJ1ID, [strAttrID]: "j", [numAttrID]: 1 })
   expect(dataset.getCase(caseK2ID, { canonical: true }))
     .toEqual({ __id__: caseK2ID, [strAttrID]: "k", [numAttrID]: 2 })
   expect(dataset.getCases([caseJ1ID, caseK2ID], { canonical: true }))
     .toEqual([{ __id__: caseJ1ID, [strAttrID]: "j", [numAttrID]: 1 },
               { __id__: caseK2ID, [strAttrID]: "k", [numAttrID]: 2 }])
   expect(dataset.getCasesAtIndex().length).toBe(7)
   expect(dataset.getCasesAtIndex(4).length).toBe(3)

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
  expect(dataset.cases.length).toBe(6)
  dataset.removeCases([caseA1ID, caseB2ID])
  expect(dataset.cases.length).toBe(4)
  // validate that caseIDMap is correct
  dataset.cases.forEach((aCase: ICaseID) => {
    const caseIndex = dataset.caseIndexFromID(aCase.__id__)
    expect((caseIndex >= 0) ? dataset.cases[caseIndex].__id__ : "").toBe(aCase.__id__)
  })
  dataset.removeCases([""])
  expect(dataset.cases.length).toBe(4)
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

test("Caching mode", () => {
  const ds = DataSet.create({ name: "data" })

  // add attributes and cases
  ds.addAttribute({ name: "str" })
  ds.addAttribute({ name: "num" })
  // const strAttrID = ds.attributes[0].id
  const numAttrID = ds.attributes[1].id
  ds.addCases(toCanonical(ds, [{ str: "a", num: 1 }, { str: "b", num: 2 }, { str: "c", num: 3 }]))
  const aId = ds.cases[0].__id__
  // const bId = ds.cases[1].__id__
  // const cId = ds.cases[2].__id__

  expect(ds.isCaching).toBe(false)
  ds.beginCaching()
  expect(ds.isCaching).toBe(true)

  const actionHandler = jest.fn()
  const snapshotHandler = jest.fn()
  onAction(ds, () => actionHandler())
  onSnapshot(ds, () => snapshotHandler())
  ds.setCaseValues([{ __id__: aId, [numAttrID]: -1 }])
  expect(actionHandler).toHaveBeenCalledTimes(1)
  expect(snapshotHandler).not.toHaveBeenCalled()
  expect(ds.caseCache.get(aId)?.[numAttrID]).toBe(-1)
  expect(ds.getValue(aId, numAttrID)).toBe(-1)
  expect(ds.getNumeric(aId, numAttrID)).toBe(-1)

  ds.endCaching(true)
  expect(ds.isCaching).toBe(false)
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
