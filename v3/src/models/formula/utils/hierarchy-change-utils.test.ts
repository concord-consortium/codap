import {
  getAffectedFormulas, getHierarchyStructureKey, HierarchySnapshot, IHierarchyFormulaInfo
} from "./hierarchy-change-utils"

const formula = (overrides: Partial<IHierarchyFormulaInfo> = {}): IHierarchyFormulaInfo =>
  ({ formulaId: "F", attrId: "f", localAttrDeps: [], hasAggregate: false, ...overrides })

describe("getAffectedFormulas", () => {
  it("rule 1: moved formula attribute -> ALL_CASES, forceWrite", () => {
    const before: HierarchySnapshot = [
      { id: "P", attrIds: ["f"], caseIds: ["p1"] }, { id: "C", attrIds: ["x"], caseIds: ["c1"] }]
    const after: HierarchySnapshot = [
      { id: "P", attrIds: [], caseIds: ["p1"] }, { id: "C", attrIds: ["x", "f"], caseIds: ["c1"] }]
    expect(getAffectedFormulas(before, after, [formula()]))
      .toEqual([{ formulaId: "F", cases: "ALL_CASES", forceWrite: true }])
  })

  it("rule 2: new cases only -> those case IDs, forceWrite", () => {
    const before: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p1", "p2", "p3"] }]
    const after: HierarchySnapshot = [{ id: "P", attrIds: ["f"], caseIds: ["p1", "p4"] }]
    expect(getAffectedFormulas(before, after, [formula()]))
      .toEqual([{ formulaId: "F", cases: ["p4"], forceWrite: true }])
  })

  it("rule 2: reordered cases -> ALL_CASES", () => {
    const before: HierarchySnapshot = [{ id: "C", attrIds: ["f"], caseIds: ["a", "b"] }]
    const after: HierarchySnapshot = [{ id: "C", attrIds: ["f"], caseIds: ["b", "a"] }]
    expect(getAffectedFormulas(before, after, [formula()]))
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
})
