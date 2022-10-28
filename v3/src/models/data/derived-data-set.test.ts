describe("Derived data set functionality commented out until further notice", () => {
  it("passes a trivial test to silence the linter", () => {
    expect(true).toBe(true)
  })
})
// eslint-disable-next-line jest/no-commented-out-tests
// test("Derived DataSet functionality", () => {
//   const dataset = DataSet.create({ name: "data" })

//   // add attributes and cases
//   dataset.addAttribute({ name: "str" })
//   dataset.addAttribute({ name: "num" })
//   const strAttrID = dataset.attributes[0].id
//   dataset.addCases(toCanonical(dataset, [{ str: "a", num: 1 }, { str: "b", num: 2 }, { str: "c", num: 3 }]))

//   const derived = dataset.derive("derived")
//   expect(derived.name).toBe("derived")
//   expect(derived.attributes.length).toBe(2)
//   expect(derived.cases.length).toBe(3)
//   const derivedCase0ID = derived.cases[0].__id__,
//         derivedCase1ID = derived.cases[1].__id__,
//         derivedCases = derived.getCases([derivedCase0ID, derivedCase1ID], { canonical: false })
//   expect(derivedCases[0]).toEqual({ __id__: derivedCase0ID, str: "a", num: 1 })
//   expect(derivedCases[1]).toEqual({ __id__: derivedCase1ID, str: "b", num: 2 })

//   const derived2 = dataset.derive("derived2", { attributeIDs: [strAttrID, ""] })
//   expect(derived2.name).toBe("derived2")
//   expect(derived2.attributes.length).toBe(1)
//   expect(derived.cases.length).toBe(3)
//   const derived2Case0ID = derived2.cases[0].__id__,
//         derived2Case1ID = derived2.cases[1].__id__,
//         derived2Cases = derived2.getCases([derived2Case0ID, derived2Case1ID], { canonical: false })
//   expect(derived2Cases[0]).toEqual({ __id__: derived2Case0ID, str: "a" })
//   expect(derived2Cases[1]).toEqual({ __id__: derived2Case1ID, str: "b" })

//   const filter: ICaseFilter = (attrID, aCase) => {
//           const id = attrID("num")
//           const num = id && aCase?.[id]
//           return (num != null) && (num >= 3) ? aCase : undefined
//         },
//         derived3 = dataset.derive("derived3", { filter })
//   expect(derived3.name).toBe("derived3")
//   expect(derived3.attributes.length).toBe(2)
//   expect(derived3.cases.length).toBe(1)
//   const derived3Case0ID = derived3.cases[0].__id__,
//         derived3Cases = derived3.getCases([derived3Case0ID], { canonical: false })
//   expect(derived3Cases[0]).toEqual({ __id__: derived3Case0ID, str: "c", num: 3 })

//   const derived4 = dataset.derive()
//   expect(derived4.name).toBe("data")
// })

// function createDataSet(name: string) {
//   const ds = DataSet.create({ name })
//   // add attributes and cases
//   ds.addAttribute({ name: "str" })
//   ds.addAttribute({ name: "num" })
//   ds.addCases(toCanonical(ds, [{ str: "a", num: 1 },
//                                { str: "b", num: 2 },
//                                { str: "c", num: 3 },
//                                { str: "d", num: 4 },
//                                { str: "e", num: 5 }]))
//   return ds
// }

// function createOdds(source: IDataSet) {
//   const numAttr = source.attrFromName("num"),
//         numAttrID = numAttr?.id || ""
//   return source.derive("odds", {
//                         attributeIDs: [numAttrID],
//                         filter: (attrID: (name: string) => string, aCase: ICase) => {
//                           const id = attrID("num")
//                           const num: number = id && Number(aCase?.[id]) || 0
//                           return num % 2 ? aCase : undefined
//                         },
//                         synchronize: true
//                       })
// }

// function createEvens(source: IDataSet) {
//   return source.derive("evens", {
//                         filter: (attrID: (name: string) => string, aCase: ICase) => {
//                           const id = attrID("num")
//                           const num: number = id && Number(aCase?.[id]) || 0
//                           return num % 2 === 0 ? aCase : undefined
//                         },
//                         synchronize: true
//                       })
// }

// eslint-disable-next-line jest/no-commented-out-tests
// test("Derived DataSet synchronization (subset attributes)", () => {
//   const source = createDataSet("source"),
//         odds = createOdds(source)

//   expect(odds.attributes.length).toBe(1)

//   const bCaseID = source.cases[1].__id__,
//         cCaseID = source.cases[2].__id__,
//         dCaseID = source.cases[3].__id__,
//         eCaseID = source.cases[4].__id__
//   let abCaseID: string,
//       cdCaseID: string,
//       gCaseID: string
//   source.addAttribute({ name: "foo" })
//   const fooAttrID = source.attributes[2].id

//   return odds.onSynchronized()
//     .then(() => {
//       expect(odds.isSynchronizing).toBe(false)
//       expect(odds.attributes.length).toBe(1)

//       source.removeAttribute(fooAttrID)
//       return odds.onSynchronized()
//     })
//     .then(() => {
//       expect(odds.attributes.length).toBe(1)

//       source.addCases(toCanonical(source, [{ str: "f", num: 6 }, { str: "g", num: 7 }]))
//       gCaseID = source.cases[6].__id__
//       return odds.onSynchronized()
//     })
//     .then(() => {
//       expect(odds.cases.length).toBe(4)
//       expect(odds.getCase(gCaseID, { canonical: false })).toEqual({ __id__: gCaseID, num: 7 })

//       source.addCases(toCanonical(source, [{ str: "ab", num: -3 }, { str: "cd", num: -1 }]),
//                       { before: [bCaseID, dCaseID] })
//       abCaseID = source.cases[1].__id__
//       expect(source.getCase(abCaseID, { canonical: false })).toEqual({ __id__: abCaseID, str: "ab", num: -3 })
//       cdCaseID = source.cases[4].__id__
//       expect(source.getCase(cdCaseID, { canonical: false })).toEqual({ __id__: cdCaseID, str: "cd", num: -1 })
//       return odds.onSynchronized()
//     })
//     .then(() => {
//       expect(odds.cases.length).toBe(6)
//       expect(odds.getCase(abCaseID, { canonical: false })).toEqual({ __id__: abCaseID, num: -3 })
//       expect(odds.nextCaseID(abCaseID)).toBe(cCaseID)
//       expect(odds.getCase(cdCaseID, { canonical: false })).toEqual({ __id__: cdCaseID, num: -1 })
//       expect(odds.nextCaseID(cdCaseID)).toBe(eCaseID)
//       // setCaseValues: changing odd value to even should result in removing case
//       source.setCaseValues(toCanonical(source, [{ __id__: cCaseID, num: 2 }]))
//       return odds.onSynchronized()
//     })
//     .then(() => {
//       expect(odds.cases.length).toBe(5)
//       source.setCaseValues(toCanonical(source, [{ __id__: cCaseID, num: 3 }]))
//       return odds.onSynchronized()
//     })
//     .then(() => {
//       expect(odds.cases.length).toBe(6)
//       expect(odds.nextCaseID(cCaseID)).toBe(cdCaseID)
//       source.setCaseValues(toCanonical(source, [{ __id__: bCaseID, num: 3 }, { __id__: dCaseID, num: 5 }]))
//       return odds.onSynchronized()
//     })
//     .then(() => {
//       expect(odds.cases.length).toBe(8)
//       expect(odds.nextCaseID(bCaseID)).toBe(cCaseID)
//       expect(odds.nextCaseID(dCaseID)).toBe(eCaseID)
//       return odds.onSynchronized()
//     })
//     .then(() => {
//       // test destruction
//       destroy(odds)
//     })
// })

// eslint-disable-next-line jest/no-commented-out-tests
// test("Derived DataSet synchronization (all attributes)", () => {
//   const source = createDataSet("source"),
//         evens = createEvens(source),
//         bCaseID = evens.cases[1].__id__

//   expect(evens.attributes.length).toBe(2)

//   let a1CaseID: string, a2CaseID
//   source.addAttribute({ name: "foo" })
//   const fooAttrID = source.attributes[2].id

//   return evens.onSynchronized()
//     .then(() => {
//       expect(evens.isSynchronizing).toBe(false)
//       expect(evens.attributes.length).toBe(3)

//       source.removeAttribute(fooAttrID)
//       return evens.onSynchronized()
//     })
//     .then(() => {
//       expect(evens.attributes.length).toBe(2)

//       source.addCases(toCanonical(source, [{ str: "a1", num: -4 }, { str: "a2", num: -2 }]), { before: bCaseID })
//       return evens.onSynchronized()
//     })
//     .then(() => {
//       expect(evens.cases.length).toBe(4)
//       a1CaseID = evens.cases[1].__id__
//       a2CaseID = evens.cases[2].__id__
//       expect(evens.getCase(a1CaseID, { canonical: false })).toEqual({ __id__: a1CaseID, str: "a1", num: -4 })
//       expect(evens.nextCaseID(a1CaseID)).toBe(a2CaseID)
//       expect(evens.getCase(a2CaseID, { canonical: false })).toEqual({ __id__: a2CaseID, str: "a2", num: -2 })
//       expect(evens.nextCaseID(a2CaseID)).toBe(bCaseID)
//       return evens.onSynchronized()
//     })
//     .then(() => {
//       // test invalid setCaseValues handling
//       source.setCaseValues([{} as ICase])
//       // test invalid setCanonicalCaseValues handling
//       source.setCaseValues([{} as ICase])
//       // test multiple setCaseValues
//       source.setCaseValues(toCanonical(source, [{ __id__: a1CaseID, num: -3 }]))
//       source.setCaseValues(toCanonical(source, [{ __id__: a1CaseID, num: -2 }]))
//       return evens.onSynchronized()
//     })
//     .then(() => {
//       // test destruction
//       destroy(evens)
//     })
// })

// eslint-disable-next-line jest/no-commented-out-tests
// test("Derived DataSet synchronization (no filter)", () => {
//   const source = createDataSet("source"),
//         derived = source.derive("derived", { synchronize: true })

//   source.addCases(toCanonical(source, [{ str: "g", num: 7 }]))
//   expect(source.cases.length).toBe(6)
//   let fCaseID: string
//   const gCaseID = source.cases[5].__id__
//   return derived.onSynchronized()
//     .then(() => {
//       expect(derived.cases.length).toBe(6)
//       expect(derived.getCase(gCaseID, { canonical: false })).toEqual({ __id__: gCaseID, str: "g", num: 7 })
//       source.addCases(toCanonical(source, [{ str: "f", num: 7 }]), { before: gCaseID })
//       fCaseID = source.cases[5].__id__
//       return derived.onSynchronized()
//     })
//     .then(() => {
//       expect(derived.cases.length).toBe(7)
//       expect(derived.getCaseAtIndex(5, { canonical: false })).toEqual({ __id__: fCaseID, str: "f", num: 7 })
//       source.setCaseValues(toCanonical(source, [{ __id__: fCaseID, num: 6 }]))
//       return derived.onSynchronized()
//     })
//     .then(() => {
//       expect(derived.getCase(fCaseID, { canonical: false })).toEqual({ __id__: fCaseID, str: "f", num: 6 })
//       destroy(derived)
//     })
// })
