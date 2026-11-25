import { applyPatch, recordPatches } from "mobx-state-tree"
import { IAttributeSnapshot } from "../data/attribute"
import { IDataSet } from "../data/data-set"
import { createDataSet } from "../data/data-set-conversion"
import { AttributeFormulaAdapter } from "./attribute-formula-adapter"
import { FormulaManager } from "./formula-manager"

interface ITestItem { __id__: string, [name: string]: string | number }

function setup(attributes: IAttributeSnapshot[], items: ITestItem[]) {
  const formulaManager = new FormulaManager()
  const dataSet = createDataSet({ attributes }, { formulaManager })
  const attrId = (name: string) => dataSet.attrIDFromName(name)!
  dataSet.addCases(items.map(({ __id__, ...values }) => {
    const canonical: Record<string, string | number> = { __id__ }
    Object.entries(values).forEach(([name, value]) => { canonical[attrId(name)] = value })
    return canonical as any
  }))
  const adapter = new AttributeFormulaAdapter(formulaManager.getAdapterApi())
  formulaManager.addDataSet(dataSet)
  formulaManager.addAdapters([adapter])
  return { formulaManager, dataSet, adapter, attrId }
}

const itemIds = (dataSet: IDataSet) => dataSet.items.map(item => item.__id__)
const valuesOf = (dataSet: IDataSet, attrId: string) => itemIds(dataSet).map(id => dataSet.getValue(id, attrId))
const valueMap = (dataSet: IDataSet, attrId: string) =>
  Object.fromEntries(itemIds(dataSet).map(id => [id, dataSet.getValue(id, attrId)]))
const formulaIdOf = (dataSet: IDataSet, attrId: string) => dataSet.getAttribute(attrId)!.formula!.id

// Deterministic formulas: a fresh recalculation must not change the stored values. It writes every item,
// so items of one case that disagree with each other are caught too.
function expectOracle(formulaManager: FormulaManager, dataSet: IDataSet, attrId: string) {
  const before = valuesOf(dataSet, attrId)
  const formulaId = formulaIdOf(dataSet, attrId)
  const formulaContext = formulaManager.getFormulaContext(formulaId)
  const extraMetadata = formulaManager.getExtraMetadata(formulaId)
  formulaContext.adapter.recalculateFormula(formulaContext, extraMetadata, "ALL_CASES", { forceWrite: true })
  expect(valuesOf(dataSet, attrId)).toEqual(before)
}

const groupItems: ITestItem[] = [
  { __id__: "i1", group: "A" }, { __id__: "i2", group: "A" }, { __id__: "i3", group: "A" },
  { __id__: "i4", group: "B" }, { __id__: "i5", group: "B" }, { __id__: "i6", group: "B" }
]

const xAttrSpec: IAttributeSnapshot = { name: "x", formula: { display: "random()" } }
const xbarAttrSpec: IAttributeSnapshot = { name: "xbar", formula: { display: "mean(x)" } }

function setupReportedCase(xbarFirst = false, items = groupItems) {
  const formulaAttrs = xbarFirst ? [xbarAttrSpec, xAttrSpec] : [xAttrSpec, xbarAttrSpec]
  const env = setup([{ name: "group" }, ...formulaAttrs], items)
  const { dataSet, attrId } = env
  dataSet.moveAttributeToNewCollection(attrId("group"))
  const parentId = dataSet.collections[0].id
  const childId = dataSet.collections[1].id
  dataSet.moveAttribute(attrId("xbar"), { collection: parentId })
  return { ...env, parentId, childId }
}

function expectXbarCorrect(dataSet: IDataSet, attrId: (name: string) => string) {
  const groupOf = (id: string) => dataSet.getValue(id, attrId("group"))
  itemIds(dataSet).forEach(id => {
    const xs = itemIds(dataSet).filter(other => groupOf(other) === groupOf(id))
      .map(other => dataSet.getNumeric(other, attrId("x"))!)
    const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length
    expect(dataSet.getNumeric(id, attrId("xbar"))).toBeCloseTo(mean, 10)
  })
}

function runReportedCase(xbarFirst: boolean) {
  const { dataSet, attrId, parentId, childId } = setupReportedCase(xbarFirst)
  const xValues = valuesOf(dataSet, attrId("x"))
  expect(xValues.every(x => typeof x === "number")).toBe(true)
  expectXbarCorrect(dataSet, attrId)
  for (let i = 0; i < 2; ++i) {
    dataSet.moveAttribute(attrId("xbar"), { collection: childId })
    expect(valuesOf(dataSet, attrId("x"))).toEqual(xValues)
    expectXbarCorrect(dataSet, attrId)
    dataSet.moveAttribute(attrId("xbar"), { collection: parentId })
    expect(valuesOf(dataSet, attrId("x"))).toEqual(xValues)
    expectXbarCorrect(dataSet, attrId)
  }
}

describe("hierarchy formula recalculation", () => {
  // runReportedCase makes the assertions
  // eslint-disable-next-line jest/expect-expect
  it("reported case: x unchanged and xbar correct across moves", () => {
    runReportedCase(false)
  })

  // runReportedCase makes the assertions
  // eslint-disable-next-line jest/expect-expect
  it("same result with the formulas registered in the other order", () => {
    runReportedCase(true)
  })

  it("undo and redo of a move leave x unchanged and xbar correct", () => {
    const { dataSet, attrId, childId } = setupReportedCase()
    const xValues = valuesOf(dataSet, attrId("x"))
    const recorder = recordPatches(dataSet)
    dataSet.moveAttribute(attrId("xbar"), { collection: childId })
    recorder.stop()
    expect(valuesOf(dataSet, attrId("x"))).toEqual(xValues)
    expectXbarCorrect(dataSet, attrId)

    recorder.undo()
    expect(dataSet.collections[0].attributes.map(attr => attr?.id)).toContain(attrId("xbar"))
    expect(valuesOf(dataSet, attrId("x"))).toEqual(xValues)
    expectXbarCorrect(dataSet, attrId)

    // redo
    applyPatch(dataSet, recorder.patches)
    expect(dataSet.collections[1].attributes.map(attr => attr?.id)).toContain(attrId("xbar"))
    expect(valuesOf(dataSet, attrId("x"))).toEqual(xValues)
    expectXbarCorrect(dataSet, attrId)
  })

  it("random() + y is unchanged when y's collection is unaffected", () => {
    const items = groupItems.map((item, i) => ({ ...item, w: item.group === "A" ? 1 : 2, y: i * 10 }))
    const { dataSet, attrId } = setup(
      [{ name: "group" }, { name: "w" }, { name: "y" }, { name: "r", formula: { display: "random() + y" } }],
      items
    )
    dataSet.moveAttributeToNewCollection(attrId("group"))
    const parentId = dataSet.collections[0].id
    const childId = dataSet.collections[1].id
    dataSet.moveAttribute(attrId("w"), { collection: parentId })
    const rValues = valueMap(dataSet, attrId("r"))
    expect(Object.values(rValues).every(r => typeof r === "number")).toBe(true)

    dataSet.moveAttribute(attrId("w"), { collection: childId })
    expect(valueMap(dataSet, attrId("r"))).toEqual(rValues)
  })

  it("random() + g keeps untouched cases' values when g is unmoved in the formula's own collection", () => {
    const items: ITestItem[] = [
      { __id__: "i1", g: 1, h: "a", v: 1 }, { __id__: "i2", g: 1, h: "b", v: 2 },
      { __id__: "i3", g: 2, h: "c", v: 3 }, { __id__: "i4", g: 2, h: "c", v: 4 }
    ]
    const { dataSet, attrId } = setup(
      [{ name: "g" }, { name: "h" }, { name: "r", formula: { display: "random() + g" } }, { name: "v" }],
      items
    )
    dataSet.moveAttributeToNewCollection(attrId("g"))
    const parentId = dataSet.collections[0].id
    const childId = dataSet.collections[1].id
    dataSet.moveAttribute(attrId("h"), { collection: parentId })
    dataSet.moveAttribute(attrId("r"), { collection: parentId })
    expect(dataSet.collections[0].caseIds.length).toBe(3)
    const rBefore = valueMap(dataSet, attrId("r"))

    // the g=1 cases merge; the g=2 case keeps the same items
    dataSet.moveAttribute(attrId("h"), { collection: childId })
    expect(dataSet.collections[0].caseIds.length).toBe(2)
    const rAfter = valueMap(dataSet, attrId("r"))
    expect(rAfter.i2).toBe(rAfter.i1)
    expect(rAfter.i3).toBe(rBefore.i3)
    expect(rAfter.i4).toBe(rBefore.i4)
  })

  it("a downstream formula writes every item of a merged case", () => {
    const items: ITestItem[] = [
      { __id__: "i1", g1: "A", g2: "p", v: 1 }, { __id__: "i2", g1: "A", g2: "s", v: 2 },
      { __id__: "i3", g1: "B", g2: "q", v: 3 }
    ]
    const { dataSet, attrId } = setup([
      { name: "g1" }, { name: "g2" }, { name: "ci", formula: { display: "caseIndex" } },
      { name: "f", formula: { display: "ci + 10" } }, { name: "v" }
    ], items)
    dataSet.moveAttributeToNewCollection(attrId("g1"))
    const parentId = dataSet.collections[0].id
    const childId = dataSet.collections[1].id
    dataSet.moveAttribute(attrId("g2"), { collection: parentId })
    dataSet.moveAttribute(attrId("ci"), { collection: parentId })
    dataSet.moveAttribute(attrId("f"), { collection: parentId })
    expect(valueMap(dataSet, attrId("f"))).toEqual({ i1: 11, i2: 12, i3: 13 })

    // the first item of the merged A case already holds the merged case's value
    dataSet.moveAttribute(attrId("g2"), { collection: childId })
    expect(valueMap(dataSet, attrId("ci"))).toEqual({ i1: 1, i2: 1, i3: 2 })
    expect(valueMap(dataSet, attrId("f"))).toEqual({ i1: 11, i2: 11, i3: 12 })
  })

  it("a prev() dependent registered before its source is recalculated after it", () => {
    const items: ITestItem[] = [
      { __id__: "i1", group: "A", v: 1 }, { __id__: "i2", group: "A", v: 2 },
      { __id__: "i3", group: "B", v: 3 }, { __id__: "i4", group: "B", v: 4 }
    ]
    const { formulaManager, dataSet, attrId } = setup([
      { name: "group" }, { name: "lag", formula: { display: "prev(ci, 0)" } },
      { name: "ci", formula: { display: "caseIndex" } }, { name: "v" }
    ], items)
    expect(valueMap(dataSet, attrId("lag"))).toEqual({ i1: 0, i2: 1, i3: 2, i4: 3 })

    dataSet.moveAttributeToNewCollection(attrId("group"))
    expect(valueMap(dataSet, attrId("ci"))).toEqual({ i1: 1, i2: 2, i3: 1, i4: 2 })
    expect(valueMap(dataSet, attrId("lag"))).toEqual({ i1: 0, i2: 1, i3: 0, i4: 1 })
    expectOracle(formulaManager, dataSet, attrId("lag"))
  })

  it("a dependent registered before a mutual prev() cycle is recalculated after the cycle", () => {
    const items: ITestItem[] = [
      { __id__: "i1", group: "A", v: 1 }, { __id__: "i2", group: "A", v: 2 },
      { __id__: "i3", group: "A", v: 3 }, { __id__: "i4", group: "B", v: 4 }
    ]
    const { formulaManager, dataSet, adapter, attrId } = setup([
      { name: "group" }, { name: "d", formula: { display: "s + caseIndex" } },
      { name: "s", formula: { display: "caseIndex + prev(r, 0)" } },
      { name: "r", formula: { display: "prev(s, 0)" } }, { name: "v" }
    ], items)

    const spy = jest.spyOn(adapter, "recalculateFormula")
    dataSet.moveAttributeToNewCollection(attrId("group"))
    const order = spy.mock.calls.map(([ctx]) => ctx.formula.id)
    spy.mockRestore()
    const [dIndex, sIndex, rIndex] = ["d", "s", "r"].map(name => order.indexOf(formulaIdOf(dataSet, attrId(name))))
    // all three recalculate once each, with the cycle (s, r) broken at s and d after s
    expect(order).toHaveLength(3)
    expect(sIndex).toBe(0)
    expect(rIndex).toBeGreaterThan(sIndex)
    expect(dIndex).toBeGreaterThan(sIndex)
    expectOracle(formulaManager, dataSet, attrId("d"))
  })

  it("random() in a regrouped collection: merged case shares one value, untouched case keeps its value", () => {
    const items: ITestItem[] = [
      { __id__: "i1", g1: "A", g2: "p", v: 1 }, { __id__: "i2", g1: "A", g2: "p", v: 2 },
      { __id__: "i3", g1: "A", g2: "s", v: 3 },
      { __id__: "i4", g1: "B", g2: "q", v: 4 }, { __id__: "i5", g1: "B", g2: "q", v: 5 }
    ]
    const { dataSet, attrId } = setup(
      [{ name: "g1" }, { name: "g2" }, { name: "r", formula: { display: "random()" } }, { name: "v" }],
      items
    )
    dataSet.moveAttributeToNewCollection(attrId("g1"))
    const parentId = dataSet.collections[0].id
    const childId = dataSet.collections[1].id
    dataSet.moveAttribute(attrId("g2"), { collection: parentId })
    dataSet.moveAttribute(attrId("r"), { collection: parentId })
    expect(dataSet.collections[0].caseIds.length).toBe(3)
    const rBefore = valueMap(dataSet, attrId("r"))

    dataSet.moveAttribute(attrId("g2"), { collection: childId })
    expect(dataSet.collections[0].caseIds.length).toBe(2)
    const rAfter = valueMap(dataSet, attrId("r"))
    expect(typeof rAfter.i1).toBe("number")
    expect(rAfter.i2).toBe(rAfter.i1)
    expect(rAfter.i3).toBe(rAfter.i1)
    expect(rAfter.i4).toBe(rBefore.i4)
    expect(rAfter.i5).toBe(rBefore.i5)
  })

  describe("count() and its dependent", () => {
    const setupCount = () => {
      const items: ITestItem[] = [
        { __id__: "i1", group: "A", h: "u", v: 1 }, { __id__: "i2", group: "A", h: "u", v: 2 },
        { __id__: "i3", group: "A", h: "t", v: 3 },
        { __id__: "i4", group: "B", h: "u", v: 4 }, { __id__: "i5", group: "B", h: "t", v: 5 },
        { __id__: "i6", group: "B", h: "t", v: 6 }
      ]
      const env = setup([
        { name: "group" }, { name: "h" }, { name: "v" },
        { name: "n", formula: { display: "count()" } }, { name: "m", formula: { display: "n * 10" } }
      ], items)
      const { dataSet, attrId } = env
      dataSet.moveAttributeToNewCollection(attrId("group"))
      const parentId = dataSet.collections[0].id
      const childId = dataSet.collections[1].id
      dataSet.moveAttribute(attrId("n"), { collection: parentId })
      dataSet.moveAttribute(attrId("m"), { collection: parentId })
      return { ...env, parentId, childId }
    }

    it("recalculates count() and its dependent when a collection is inserted", () => {
      const { dataSet, adapter, attrId, childId } = setupCount()
      expect(valuesOf(dataSet, attrId("n"))).toEqual([3, 3, 3, 3, 3, 3])
      expect(valuesOf(dataSet, attrId("m"))).toEqual([30, 30, 30, 30, 30, 30])
      const mFormulaId = formulaIdOf(dataSet, attrId("m"))
      const spy = jest.spyOn(adapter, "recalculateFormula")
      dataSet.moveAttributeToNewCollection(attrId("h"), childId)
      expect(dataSet.collections.length).toBe(3)
      expect(valuesOf(dataSet, attrId("n"))).toEqual([2, 2, 2, 2, 2, 2])
      expect(valuesOf(dataSet, attrId("m"))).toEqual([20, 20, 20, 20, 20, 20])
      const mCalls = spy.mock.calls.filter(([context]) => context.formula.id === mFormulaId)
      expect(mCalls.length).toBe(1)
      spy.mockRestore()
    })

    it("recalculates count() when the middle collection is removed", () => {
      const { dataSet, attrId, childId } = setupCount()
      dataSet.moveAttributeToNewCollection(attrId("h"), childId)
      expect(dataSet.collections.length).toBe(3)
      dataSet.moveAttribute(attrId("h"), { collection: childId })
      expect(dataSet.collections.length).toBe(2)
      expect(valuesOf(dataSet, attrId("n"))).toEqual([3, 3, 3, 3, 3, 3])
      expect(valuesOf(dataSet, attrId("m"))).toEqual([30, 30, 30, 30, 30, 30])
    })
  })

  it("recalculates caseIndex when a new parent reorders the child", () => {
    const items: ITestItem[] = [
      { __id__: "i1", group: "A" }, { __id__: "i2", group: "B" },
      { __id__: "i3", group: "A" }, { __id__: "i4", group: "B" }
    ]
    const { formulaManager, dataSet, attrId } = setup(
      [{ name: "group" }, { name: "ci", formula: { display: "caseIndex" } }], items
    )
    expect(valuesOf(dataSet, attrId("ci"))).toEqual([1, 2, 3, 4])
    dataSet.moveAttributeToNewCollection(attrId("group"))
    expectOracle(formulaManager, dataSet, attrId("ci"))
  })

  it("widens a directly affected formula's case list when it is also downstream of a recalculated formula", () => {
    const items: ITestItem[] = [
      { __id__: "i1", group: "A", h: "u", k: 1 }, { __id__: "i2", group: "A", h: "u", k: 2 },
      { __id__: "i3", group: "A", h: "t", k: 3 }, { __id__: "i4", group: "B", h: "u", k: 4 },
      { __id__: "i5", group: "B", h: "t", k: 5 }, { __id__: "i6", group: "B", h: "t", k: 5 }
    ]
    const { dataSet, attrId } = setup([
      { name: "group" }, { name: "h" }, { name: "k" }, { name: "v" },
      { name: "n", formula: { display: "count()" } }, { name: "d", formula: { display: "n * 10" } }
    ], items)
    // P (group, n = count()), M (h, d = n * 10), C (k, v)
    dataSet.moveAttributeToNewCollection(attrId("group"))
    const parentId = dataSet.collections[0].id
    const middle = dataSet.moveAttributeToNewCollection(attrId("h"), dataSet.collections[1].id)!
    dataSet.moveAttribute(attrId("n"), { collection: parentId })
    dataSet.moveAttribute(attrId("d"), { collection: middle.id })
    expect(valuesOf(dataSet, attrId("n"))).toEqual([2, 2, 2, 2, 2, 2])
    expect(valuesOf(dataSet, attrId("d"))).toEqual([20, 20, 20, 20, 20, 20])

    // splits one of M's cases (A/u), which adds a case to M and changes count() in P
    dataSet.moveAttribute(attrId("k"), { collection: middle.id })
    expect(dataSet.collections[1].caseIds.length).toBe(5)
    expect(valuesOf(dataSet, attrId("n"))).toEqual([3, 3, 3, 2, 2, 2])
    expect(valuesOf(dataSet, attrId("d"))).toEqual([30, 30, 30, 20, 20, 20])
  })

  describe("child formulas when only the grouping above changes", () => {
    // sorted by g1 then g2, so the child's cases keep their order when parents are added or removed
    const sortedItems: ITestItem[] = [
      { __id__: "i1", g1: "A", g2: "p", v: 1 }, { __id__: "i2", g1: "A", g2: "p", v: 2 },
      { __id__: "i3", g1: "A", g2: "s", v: 3 }, { __id__: "i4", g1: "B", g2: "q", v: 4 }
    ]
    const setupSorted = () => setup([
      { name: "g1" }, { name: "g2" }, { name: "v" },
      { name: "ci", formula: { display: "caseIndex" } },
      { name: "pv", formula: { display: "prev(v, 0)" } },
      { name: "mu", formula: { display: "mean(v)" } }
    ], sortedItems)
    const expectAllCorrect = (formulaManager: FormulaManager, dataSet: IDataSet, attrId: (n: string) => string) => {
      ["ci", "pv", "mu"].forEach(name => expectOracle(formulaManager, dataSet, attrId(name)))
    }

    it("a parent collection is added", () => {
      const { formulaManager, dataSet, attrId } = setupSorted()
      expect(valuesOf(dataSet, attrId("ci"))).toEqual([1, 2, 3, 4])
      dataSet.moveAttributeToNewCollection(attrId("g1"))
      expect(valuesOf(dataSet, attrId("ci"))).toEqual([1, 2, 3, 1])
      expect(valuesOf(dataSet, attrId("pv"))).toEqual([0, 1, 2, 0])
      expect(valuesOf(dataSet, attrId("mu"))).toEqual([2, 2, 2, 4])
      expectAllCorrect(formulaManager, dataSet, attrId)
    })

    it("the parent collection is removed", () => {
      const { formulaManager, dataSet, attrId } = setupSorted()
      dataSet.moveAttributeToNewCollection(attrId("g1"))
      const childId = dataSet.collections[1].id
      dataSet.moveAttribute(attrId("g1"), { collection: childId })
      expect(dataSet.collections.length).toBe(1)
      expect(valuesOf(dataSet, attrId("ci"))).toEqual([1, 2, 3, 4])
      expect(valuesOf(dataSet, attrId("pv"))).toEqual([0, 1, 2, 3])
      expect(valuesOf(dataSet, attrId("mu"))).toEqual([2.5, 2.5, 2.5, 2.5])
      expectAllCorrect(formulaManager, dataSet, attrId)
    })

    it("parent cases are split and merged", () => {
      const { formulaManager, dataSet, attrId } = setupSorted()
      dataSet.moveAttributeToNewCollection(attrId("g1"))
      const parentId = dataSet.collections[0].id
      const childId = dataSet.collections[1].id
      dataSet.moveAttribute(attrId("g2"), { collection: parentId })
      expect(dataSet.collections[0].caseIds.length).toBe(3)
      expect(valuesOf(dataSet, attrId("ci"))).toEqual([1, 2, 1, 1])
      expectAllCorrect(formulaManager, dataSet, attrId)
      dataSet.moveAttribute(attrId("g2"), { collection: childId })
      expect(dataSet.collections[0].caseIds.length).toBe(2)
      expect(valuesOf(dataSet, attrId("ci"))).toEqual([1, 2, 3, 1])
      expectAllCorrect(formulaManager, dataSet, attrId)
    })
  })

  describe("reaction cost", () => {
    it("does not force a regroup for a data set without formulas", () => {
      const countInvalidations = (ds: IDataSet) => {
        const spy = jest.spyOn(ds, "invalidateCases")
        ds.moveAttributeToNewCollection(ds.attrIDFromName("group")!)
        ds.validateCases()
        const count = spy.mock.calls.length
        spy.mockRestore()
        return count
      }
      const attributes = [{ name: "group" }, { name: "v" }]
      // the same move in a data set the formula manager doesn't observe
      const unobserved = createDataSet({ attributes })
      unobserved.addCases(groupItems.map(({ __id__ }) => ({ __id__ })))
      const { dataSet } = setup(attributes, groupItems)
      expect(countInvalidations(dataSet)).toBe(countInvalidations(unobserved))
    })

    it("does not recalculate when attributes are reordered within a collection", () => {
      const { formulaManager, dataSet, attrId } = setupReportedCase()
      const spy = jest.spyOn(formulaManager, "recalculateFormulasInOrder")
      const parentAttrIds = dataSet.collections[0].attributes.map(attr => attr!.id)
      expect(parentAttrIds).toEqual([attrId("group"), attrId("xbar")])
      dataSet.moveAttribute(attrId("xbar"), { before: attrId("group") })
      expect(dataSet.collections[0].attributes.map(attr => attr!.id)).toEqual([attrId("xbar"), attrId("group")])
      dataSet.validateCases()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it("stops observing a data set once it is removed", () => {
      const { formulaManager, dataSet, attrId, childId } = setupReportedCase()
      formulaManager.removeDataSet(dataSet.id)
      const spy = jest.spyOn(formulaManager, "getHierarchyFormulaInfos")
      dataSet.moveAttribute(attrId("xbar"), { collection: childId })
      dataSet.validateCases()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  it("move in an empty data set does not throw", () => {
    const { dataSet, attrId, parentId, childId } = setupReportedCase(false, [])
    expect(() => {
      dataSet.moveAttribute(attrId("xbar"), { collection: childId })
      dataSet.moveAttribute(attrId("xbar"), { collection: parentId })
    }).not.toThrow()
  })
})
