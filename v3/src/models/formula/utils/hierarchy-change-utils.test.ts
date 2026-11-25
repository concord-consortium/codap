import {
  getAffectedFormulas, getHierarchyStructureKey, HierarchySnapshot, IHierarchyFormulaInfo
} from "./hierarchy-change-utils"

const formula = (overrides: Partial<IHierarchyFormulaInfo> = {}): IHierarchyFormulaInfo =>
  ({ formulaId: "F", attrId: "f", localAttrDeps: [], hasAggregate: false, orderSensitive: false, ...overrides })

describe("getAffectedFormulas", () => {
  it("rule 1: moved formula attribute -> ALL_CASES, forceWrite", () => {
    const before: HierarchySnapshot = [
      { id: "P", attrIds: ["f"], caseIds: ["p1"] }, { id: "C", attrIds: ["x"], caseIds: ["c1"] }]
    const after: HierarchySnapshot = [
      { id: "P", attrIds: [], caseIds: ["p1"] }, { id: "C", attrIds: ["x", "f"], caseIds: ["c1"] }]
    expect(getAffectedFormulas(before, after, [formula()]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: true }])
  })

  it("rule 2: cases only appended -> those case IDs, forceWrite", () => {
    const before: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p1", "p2"] }]
    const after: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p1", "p2", "p4"] }]
    expect(getAffectedFormulas(before, after, [formula()]))
      .toEqual([{ formulaId: "F", cases: ["p4"], forceWrite: true }])
  })

  it.each([
    ["new cases plus removals", ["p1", "p2", "p3"], ["p1", "p4"]],
    ["insertion in the middle", ["p1", "p2"], ["p1", "p3", "p2"]],
    ["removal ahead of a retained case", ["p1", "p2", "p3"], ["p4", "p3"]],
    ["removal only at the end", ["p1", "p2", "p3"], ["p1", "p2"]]
  ])("rule 2: %s -> ALL_CASES for an order-sensitive formula", (_name, beforeIds, afterIds) => {
    const before: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: beforeIds }]
    const after: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: afterIds }]
    expect(getAffectedFormulas(before, after, [formula({ orderSensitive: true })]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: true }])
  })

  it("rule 2: shifted retained cases -> only new cases for a formula that is not order-sensitive", () => {
    const before: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p1", "p2", "p3"] }]
    const after: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p4", "p3"] }]
    expect(getAffectedFormulas(before, after, [formula()]))
      .toEqual([{ formulaId: "F", cases: ["p4"], forceWrite: true }])
  })

  it("rule 2: removal only -> not affected for a formula that is not order-sensitive", () => {
    const before: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p1", "p2", "p3"] }]
    const after: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p1", "p2"] }]
    expect(getAffectedFormulas(before, after, [formula()])).toEqual([])
  })

  it("rules 3 and 4: a collection that only lost cases counts as changed", () => {
    const P = { id: "P", attrIds: ["f"], caseIds: ["p1"] }
    const beforeC = { id: "C", attrIds: ["g"], caseIds: ["c1", "c2"] }
    const afterC = { id: "C", attrIds: ["g"], caseIds: ["c1"] }
    // rule 4: aggregate in P, C below lost a case
    expect(getAffectedFormulas([P, beforeC], [P, afterC], [formula({ hasAggregate: true })]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: false }])
    // rule 3: F depends on g, which is in C
    const Q = { id: "Q", attrIds: ["f"], caseIds: ["q1"] }
    expect(getAffectedFormulas([Q, beforeC], [Q, afterC], [formula({ localAttrDeps: ["g"] })]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: false }])
  })

  it("rule 2: reordered cases -> ALL_CASES for an order-sensitive formula", () => {
    const before: HierarchySnapshot = [{ id: "C", attrIds: ["f"], caseIds: ["a", "b"] }]
    const after: HierarchySnapshot = [{ id: "C", attrIds: ["f"], caseIds: ["b", "a"] }]
    expect(getAffectedFormulas(before, after, [formula({ orderSensitive: true })]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: true }])
  })

  it("rule 3: dependency on attribute in changed collection -> ALL_CASES, no forceWrite", () => {
    const before: HierarchySnapshot = [
      { id: "P", attrIds: ["g"], caseIds: ["p1"] }, { id: "C", attrIds: ["f"], caseIds: ["c1"] }]
    const after: HierarchySnapshot = [
      { id: "P", attrIds: ["g"], caseIds: ["p1", "p2"] }, { id: "C", attrIds: ["f"], caseIds: ["c1"] }]
    expect(getAffectedFormulas(before, after, [formula({ localAttrDeps: ["g"] })]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: false }])
  })

  it("rule 3: an unmoved dependency in the formula's own collection doesn't widen new cases to ALL_CASES", () => {
    const before: HierarchySnapshot = [
      { id: "P", attrIds: ["f", "g"], caseIds: ["p1", "p2", "p3"] }, { id: "C", attrIds: ["v"], caseIds: ["c1"] }]
    const after: HierarchySnapshot = [
      { id: "P", attrIds: ["f", "g"], caseIds: ["p4", "p3"] }, { id: "C", attrIds: ["v", "h"], caseIds: ["c1"] }]
    expect(getAffectedFormulas(before, after, [formula({ localAttrDeps: ["g"] })]))
      .toEqual([{ formulaId: "F", cases: ["p4"], forceWrite: true }])
  })

  it("rule 3: dependency on moved attribute", () => {
    const before: HierarchySnapshot = [
      { id: "P", attrIds: ["y"], caseIds: ["p1"] }, { id: "C", attrIds: ["f"], caseIds: ["c1"] }]
    const after: HierarchySnapshot = [
      { id: "P", attrIds: [], caseIds: ["p1"] }, { id: "C", attrIds: ["f", "y"], caseIds: ["c1"] }]
    expect(getAffectedFormulas(before, after, [formula({ localAttrDeps: ["y"] })]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: false }])
  })

  describe("rule 4", () => {
    const P = { id: "P", attrIds: ["f"], caseIds: ["p1"] }
    const C = { id: "C", attrIds: ["x"], caseIds: ["c1"] }
    const M = { id: "M", attrIds: ["m"], caseIds: ["m1"] }
    it("aggregate with a collection added below", () => {
      expect(getAffectedFormulas([P, C], [P, M, C], [formula({ hasAggregate: true })]))
        .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: false }])
      expect(getAffectedFormulas([P, C], [P, M, C], [formula({ hasAggregate: false })])).toEqual([])
    })
    it("aggregate with a collection removed below", () => {
      expect(getAffectedFormulas([P, M, C], [P, C], [formula({ hasAggregate: true })]))
        .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: false }])
      expect(getAffectedFormulas([P, M, C], [P, C], [formula({ hasAggregate: false })])).toEqual([])
    })
    it("ignores a collection removed above the formula's collection", () => {
      const F = { id: "F", attrIds: ["f"], caseIds: ["f1"] }
      expect(getAffectedFormulas([M, F], [F], [formula({ hasAggregate: true })])).toEqual([])
    })
  })

  describe("rule 2: a collection is disturbed when the grouping above it changes", () => {
    const C = { id: "C", attrIds: ["f", "v"], caseIds: ["c1", "c2", "c3", "c4"] }
    const orderSensitive = formula({ orderSensitive: true })
    const allCasesForced = [{ formulaId: "F", cases: "ALL_CASES", forceWrite: true }]
    it("parent cases merged while the child's cases are unchanged", () => {
      const before = [{ id: "P", attrIds: ["g"], caseIds: ["p1", "p2", "p3"] }, C]
      const after = [{ id: "P", attrIds: ["g"], caseIds: ["p4", "p3"] }, C]
      expect(getAffectedFormulas(before, after, [orderSensitive])).toEqual(allCasesForced)
      expect(getAffectedFormulas(before, after, [formula()])).toEqual([])
    })
    it("grandparent changed while the parent and child cases are unchanged", () => {
      const P = { id: "P", attrIds: ["h"], caseIds: ["p1", "p2"] }
      const before = [{ id: "G", attrIds: ["g"], caseIds: ["g1", "g2"] }, P, C]
      const after = [{ id: "G", attrIds: ["g"], caseIds: ["g3"] }, P, C]
      expect(getAffectedFormulas(before, after, [orderSensitive])).toEqual(allCasesForced)
    })
    it("a collection added above", () => {
      const after = [{ id: "P", attrIds: ["g"], caseIds: ["p1", "p2"] }, C]
      expect(getAffectedFormulas([C], after, [orderSensitive])).toEqual(allCasesForced)
      expect(getAffectedFormulas([C], after, [formula()])).toEqual([])
    })
    it("a collection removed above", () => {
      const before = [{ id: "P", attrIds: ["g"], caseIds: ["p1", "p2"] }, C]
      expect(getAffectedFormulas(before, [C], [orderSensitive])).toEqual(allCasesForced)
      expect(getAffectedFormulas(before, [C], [formula()])).toEqual([])
    })
    it("not disturbed when nothing above changed", () => {
      const P = { id: "P", attrIds: ["g"], caseIds: ["p1", "p2"] }
      const C2 = { id: "C2", attrIds: ["x"], caseIds: ["d1", "d2"] }
      const before = [P, C, C2]
      const after = [P, C, { ...C2, caseIds: ["d1", "d2", "d3"] }]
      expect(getAffectedFormulas(before, after, [orderSensitive])).toEqual([])
    })
  })

  it("unaffected: random() in an unchanged collection", () => {
    const before: HierarchySnapshot = [
      { id: "P", attrIds: ["a", "b"], caseIds: ["p1"] }, { id: "C", attrIds: ["f"], caseIds: ["c1", "c2"] }]
    const after: HierarchySnapshot = [
      { id: "P", attrIds: ["a"], caseIds: ["p1"] }, { id: "C", attrIds: ["f", "b"], caseIds: ["c1", "c2"] }]
    expect(getAffectedFormulas(before, after, [formula()])).toEqual([])
  })

  it("merges rules: ALL_CASES beats a case list and forceWrite is OR'ed", () => {
    const before: HierarchySnapshot = [
      { id: "P", attrIds: ["g"], caseIds: ["p1"] }, { id: "C", attrIds: ["f"], caseIds: ["c1"] }]
    const after: HierarchySnapshot = [
      { id: "P", attrIds: ["g"], caseIds: ["p1", "p2"] }, { id: "C", attrIds: ["f"], caseIds: ["c1", "c2"] }]
    expect(getAffectedFormulas(before, after, [formula({ localAttrDeps: ["g"] })]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: true }])
  })
})

describe("getHierarchyStructureKey", () => {
  it("ignores case IDs but reflects collection and attribute membership", () => {
    const a: HierarchySnapshot = [{ id: "P", attrIds: ["x"], caseIds: ["p1"] }]
    const b: HierarchySnapshot = [{ id: "P", attrIds: ["x"], caseIds: ["p2", "p3"] }]
    const c: HierarchySnapshot = [{ id: "P", attrIds: ["x", "y"], caseIds: ["p1"] }]
    expect(getHierarchyStructureKey(a)).toBe(getHierarchyStructureKey(b))
    expect(getHierarchyStructureKey(a)).not.toBe(getHierarchyStructureKey(c))
  })

  it("ignores the order of attributes within a collection", () => {
    const a: HierarchySnapshot = [{ id: "P", attrIds: ["x", "y"], caseIds: [] }]
    const b: HierarchySnapshot = [{ id: "P", attrIds: ["y", "x"], caseIds: [] }]
    expect(getHierarchyStructureKey(a)).toBe(getHierarchyStructureKey(b))
  })
})
