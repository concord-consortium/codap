import { runInAction, when } from "mobx"
import { applyPatch, destroy, Instance, recordPatches } from "mobx-state-tree"
import { createCodapDocument } from "../codap/create-codap-document"
import { IAttributeSnapshot } from "../data/attribute"
import { IDataSet } from "../data/data-set"
import { createDataSet } from "../data/data-set-conversion"
import { TreeManager } from "../history/tree-manager"
import { SharedDataSet } from "../shared/shared-data-set"
import { getFormulaManager, getSharedModelManager } from "../tiles/tile-environment"
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

// x = random() and xbar = mean(x), grouped by group, with xbar in the parent collection
function setupMeanOfRandom(xbarFirst = false, items = groupItems) {
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

function runMeanOfRandomMoves(xbarFirst: boolean) {
  const { dataSet, attrId, parentId, childId } = setupMeanOfRandom(xbarFirst)
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
  // Only xbar is affected by these moves, so the registration order matters only to how the formulas were
  // first calculated. runMeanOfRandomMoves makes the assertions.
  // eslint-disable-next-line jest/expect-expect
  it.each([["x", false], ["xbar", true]])(
    "mean(random()): x unchanged and xbar correct across moves of xbar, with %s registered first",
    (_first, xbarFirst) => runMeanOfRandomMoves(xbarFirst)
  )

  it("undo and redo of a move leave x unchanged and xbar correct", () => {
    const { dataSet, attrId, childId } = setupMeanOfRandom()
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

  it("caseIndex and a formula that depends on it write every item of a merged parent case", () => {
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
    // all three recalculate once each, with the cycle (s, r) broken at s and d after the cycle
    expect(order).toHaveLength(3)
    expect(sIndex).toBe(0)
    expect(rIndex).toBeGreaterThan(sIndex)
    expect(dIndex).toBeGreaterThan(rIndex)
    expectOracle(formulaManager, dataSet, attrId("d"))
  })

  it("an upstream prev() cycle is recalculated before a downstream cycle registered earlier", () => {
    const items: ITestItem[] = [
      { __id__: "i1", group: "A", v: 1 }, { __id__: "i2", group: "A", v: 2 },
      { __id__: "i3", group: "B", v: 3 }, { __id__: "i4", group: "B", v: 4 }
    ]
    const { dataSet, adapter, attrId } = setup([
      { name: "group" },
      { name: "c", formula: { display: "a + prev(d, 0)" } }, { name: "d", formula: { display: "prev(c, 0)" } },
      { name: "a", formula: { display: "caseIndex + prev(b, 0)" } }, { name: "b", formula: { display: "prev(a, 0)" } },
      { name: "v" }
    ], items)

    const spy = jest.spyOn(adapter, "recalculateFormula")
    dataSet.moveAttributeToNewCollection(attrId("group"))
    const order = spy.mock.calls.map(([ctx]) => ctx.formula.id)
    spy.mockRestore()
    const [aIndex, bIndex, cIndex, dIndex] =
      ["a", "b", "c", "d"].map(name => order.indexOf(formulaIdOf(dataSet, attrId(name))))
    // each formula recalculates once, and the upstream cycle (a, b) runs before the downstream cycle (c, d)
    expect(order).toHaveLength(4)
    expect(Math.max(aIndex, bIndex)).toBeLessThan(Math.min(cIndex, dIndex))
    expect(aIndex).toBeLessThan(bIndex)
    expect(cIndex).toBeLessThan(dIndex)
  })

  it("within a prev() cycle, a member that depends directly on another runs after it", () => {
    const items: ITestItem[] = [
      { __id__: "i1", g: "x", v: 1 }, { __id__: "i2", g: "y", v: 2 }, { __id__: "i3", g: "x", v: 3 }
    ]
    // b is registered first, but depends directly on a; a depends on b only through prev()
    const { formulaManager, dataSet, adapter, attrId } = setup([
      { name: "g" }, { name: "b", formula: { display: "a * 2" } },
      { name: "a", formula: { display: "prev(b, 0) + caseIndex" } }, { name: "v" }
    ], items)

    const spy = jest.spyOn(adapter, "recalculateFormula")
    dataSet.moveAttributeToNewCollection(attrId("g"))
    const order = spy.mock.calls.map(([ctx]) => ctx.formula.id)
    spy.mockRestore()
    const [aIndex, bIndex] = ["a", "b"].map(name => order.indexOf(formulaIdOf(dataSet, attrId(name))))
    expect(aIndex).toBeGreaterThanOrEqual(0)
    expect(bIndex).toBeGreaterThan(aIndex)
    itemIds(dataSet).forEach(id => {
      expect(dataSet.getNumeric(id, attrId("b"))).toBe(2 * dataSet.getNumeric(id, attrId("a"))!)
    })
    expectOracle(formulaManager, dataSet, attrId("b"))
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

  it("random() in a parent left with only formula attributes shares one value across its single case", () => {
    // the single case's group key differs from the blank group's, so the merged case gets a new case ID
    const items: ITestItem[] = [
      { __id__: "i1", group: "", v: 1 }, { __id__: "i2", group: "A", v: 2 },
      { __id__: "i3", group: "B", v: 3 }, { __id__: "i4", group: "A", v: 4 }
    ]
    const { dataSet, attrId } = setup(
      [{ name: "group" }, { name: "v" }, { name: "r", formula: { display: "random()" } }], items
    )
    dataSet.moveAttributeToNewCollection(attrId("group"))
    const parentId = dataSet.collections[0].id
    const childId = dataSet.collections[1].id
    dataSet.moveAttribute(attrId("r"), { collection: parentId })
    const blankCaseId = dataSet.getItemCaseIds("i1")[0]
    expect(new Set(valuesOf(dataSet, attrId("r"))).size).toBe(3)

    dataSet.moveAttribute(attrId("group"), { collection: childId })
    expect(dataSet.collections[0].caseIds).toHaveLength(1)
    expect(dataSet.collections[0].caseIds).not.toContain(blankCaseId)
    const rValues = valuesOf(dataSet, attrId("r"))
    expect(typeof rValues[0]).toBe("number")
    expect(new Set(rValues).size).toBe(1)
  })

  describe("count() and its dependents (m = n * 10, k = m + 1)", () => {
    const setupCount = () => {
      const items: ITestItem[] = [
        { __id__: "i1", group: "A", h: "u", v: 1 }, { __id__: "i2", group: "A", h: "u", v: 2 },
        { __id__: "i3", group: "A", h: "t", v: 3 },
        { __id__: "i4", group: "B", h: "u", v: 4 }, { __id__: "i5", group: "B", h: "t", v: 5 },
        { __id__: "i6", group: "B", h: "t", v: 6 }
      ]
      const env = setup([
        { name: "group" }, { name: "h" }, { name: "v" },
        { name: "n", formula: { display: "count()" } }, { name: "m", formula: { display: "n * 10" } },
        { name: "k", formula: { display: "m + 1" } }
      ], items)
      const { dataSet, attrId } = env
      dataSet.moveAttributeToNewCollection(attrId("group"))
      const parentId = dataSet.collections[0].id
      const childId = dataSet.collections[1].id
      dataSet.moveAttribute(attrId("n"), { collection: parentId })
      dataSet.moveAttribute(attrId("m"), { collection: parentId })
      dataSet.moveAttribute(attrId("k"), { collection: parentId })
      return { ...env, parentId, childId }
    }

    it("recalculates count() and its dependents when a collection is inserted", () => {
      const { dataSet, adapter, attrId, childId } = setupCount()
      expect(valuesOf(dataSet, attrId("n"))).toEqual([3, 3, 3, 3, 3, 3])
      expect(valuesOf(dataSet, attrId("m"))).toEqual([30, 30, 30, 30, 30, 30])
      const mFormulaId = formulaIdOf(dataSet, attrId("m"))
      const spy = jest.spyOn(adapter, "recalculateFormula")
      dataSet.moveAttributeToNewCollection(attrId("h"), childId)
      expect(dataSet.collections.length).toBe(3)
      expect(valuesOf(dataSet, attrId("n"))).toEqual([2, 2, 2, 2, 2, 2])
      expect(valuesOf(dataSet, attrId("m"))).toEqual([20, 20, 20, 20, 20, 20])
      expect(valuesOf(dataSet, attrId("k"))).toEqual([21, 21, 21, 21, 21, 21])
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
      expect(valuesOf(dataSet, attrId("k"))).toEqual([31, 31, 31, 31, 31, 31])
    })
  })

  it("random() keeps its values when a structure change follows a value edit that regrouped cases", () => {
    const items: ITestItem[] = [
      { __id__: "i1", g: "A", v: 1, w: "p" }, { __id__: "i2", g: "A", v: 2, w: "q" },
      { __id__: "i3", g: "B", v: 3, w: "p" }, { __id__: "i4", g: "B", v: 4, w: "q" }
    ]
    const { dataSet, attrId } = setup(
      [{ name: "g" }, { name: "v" }, { name: "w" }, { name: "r", formula: { display: "random()" } }], items
    )
    dataSet.moveAttributeToNewCollection(attrId("g"))
    const parentId = dataSet.collections[0].id
    const childId = dataSet.collections[1].id
    dataSet.moveAttribute(attrId("r"), { collection: parentId })
    // moves i1 into a new parent case
    dataSet.setCaseValues([{ __id__: "i1", [attrId("g")]: "C" }])
    dataSet.validateCases()
    expect(dataSet.collections[0].caseIds.length).toBe(3)
    const rBefore = valueMap(dataSet, attrId("r"))

    // the parent collection is unaffected by inserting a collection below it
    dataSet.moveAttributeToNewCollection(attrId("w"), childId)
    expect(dataSet.collections.length).toBe(3)
    expect(valueMap(dataSet, attrId("r"))).toEqual(rBefore)
  })

  it("random() keeps its values when a structure change follows a value edit that moved an item between cases", () => {
    const items: ITestItem[] = [
      { __id__: "i1", g: "A", v: 1 }, { __id__: "i2", g: "B", v: 2 }, { __id__: "i3", g: "B", v: 3 }
    ]
    const { dataSet, attrId } = setup([
      { name: "g" }, { name: "v" }, { name: "r", formula: { display: "random()" } },
      { name: "z", formula: { display: "v * 2" } }
    ], items)
    dataSet.moveAttributeToNewCollection(attrId("g"))
    const parentId = dataSet.collections[0].id
    dataSet.moveAttribute(attrId("r"), { collection: parentId })
    const caseIdsBefore = [...dataSet.collections[0].caseIds]
    // i2 joins case A, and neither case's ID or position changes
    dataSet.setCaseValues([{ __id__: "i2", [attrId("g")]: "A" }])
    dataSet.validateCases()
    expect(dataSet.collections[0].caseIds).toEqual(caseIdsBefore)
    const rBefore = valueMap(dataSet, attrId("r"))

    // moving an unrelated formula changes no parent case
    dataSet.moveAttribute(attrId("z"), { collection: parentId })
    expect(valueMap(dataSet, attrId("r"))).toEqual(rBefore)
  })

  describe("attributes added and removed", () => {
    const setupParent = () => {
      const items: ITestItem[] = [
        { __id__: "i1", g1: "A", g2: "p", v: 1 }, { __id__: "i2", g1: "A", g2: "s", v: 2 },
        { __id__: "i3", g1: "B", g2: "q", v: 3 }, { __id__: "i4", g1: "B", g2: "q", v: 4 }
      ]
      const env = setup([
        { name: "g1" }, { name: "g2" }, { name: "v" }, { name: "r", formula: { display: "random()" } },
        { name: "n", formula: { display: "count()" } }, { name: "ci", formula: { display: "caseIndex" } }
      ], items)
      const { dataSet, attrId } = env
      dataSet.moveAttributeToNewCollection(attrId("g1"))
      const parentId = dataSet.collections[0].id
      ;["g2", "r", "n"].forEach(name => dataSet.moveAttribute(attrId(name), { collection: parentId }))
      expect(dataSet.collections[0].caseIds.length).toBe(3)
      return { ...env, parentId }
    }

    it("adding an attribute to the parent recalculates nothing", () => {
      const { formulaManager, dataSet, attrId, parentId } = setupParent()
      const rBefore = valueMap(dataSet, attrId("r"))
      const spy = jest.spyOn(formulaManager, "recalculateFormulasInOrder")
      dataSet.addAttribute({ name: "y" }, { collection: parentId })
      dataSet.validateCases()
      expect(spy).toHaveBeenCalledWith([])
      spy.mockRestore()
      expect(valueMap(dataSet, attrId("r"))).toEqual(rBefore)
    })

    it("removing a parent grouping attribute merges cases and recalculates their formulas", () => {
      const { formulaManager, dataSet, attrId } = setupParent()
      const rBefore = valueMap(dataSet, attrId("r"))
      dataSet.removeAttribute(attrId("g2"))
      expect(dataSet.collections[0].caseIds.length).toBe(2)
      const rAfter = valueMap(dataSet, attrId("r"))
      expect(rAfter.i2).toBe(rAfter.i1)
      expect(rAfter.i3).toBe(rBefore.i3)
      expect(rAfter.i4).toBe(rBefore.i4)
      expect(valuesOf(dataSet, attrId("n"))).toEqual([2, 2, 2, 2])
      expect(valuesOf(dataSet, attrId("ci"))).toEqual([1, 2, 1, 2])
      expectOracle(formulaManager, dataSet, attrId("n"))
      expectOracle(formulaManager, dataSet, attrId("ci"))
    })
  })

  it("recalculates a lookupByKey() in another data set whose key attribute changed", () => {
    const formulaManager = new FormulaManager()
    const dataSetA = createDataSet({
      name: "A",
      attributes: [{ name: "g" }, { name: "val" }, { name: "k", formula: { display: "caseIndex" } }]
    }, { formulaManager })
    const gId = dataSetA.attrIDFromName("g")!
    const valId = dataSetA.attrIDFromName("val")!
    dataSetA.addCases([
      { __id__: "a1", [gId]: "x", [valId]: "one" }, { __id__: "a2", [gId]: "y", [valId]: "two" },
      { __id__: "a3", [gId]: "x", [valId]: "three" }
    ])
    const dataSetB = createDataSet({
      name: "B",
      attributes: [{ name: "w", formula: { display: `lookupByKey("A", "val", "k", 3)` } }]
    }, { formulaManager })
    dataSetB.addCases([{ __id__: "b1" }])
    formulaManager.addDataSet(dataSetA)
    formulaManager.addDataSet(dataSetB)
    formulaManager.addAdapters([new AttributeFormulaAdapter(formulaManager.getAdapterApi())])
    const wId = dataSetB.attrIDFromName("w")!
    expect(dataSetB.getValue("b1", wId)).toBe("three")

    // k becomes 1, 1, 2 within the new parent cases, so no case has k = 3
    dataSetA.moveAttributeToNewCollection(gId)
    expect(dataSetB.getValue("b1", wId)).toBe("")
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

    it("does not run a batch for collections built in the action that added the data set", () => {
      const formulaManager = new FormulaManager()
      formulaManager.addAdapters([new AttributeFormulaAdapter(formulaManager.getAdapterApi())])
      // the same sequence as a plugin's create dataContext request
      const dataSet = runInAction(() => {
        const ds = createDataSet({ name: "plugin" }, { formulaManager })
        formulaManager.addDataSet(ds)
        ds.removeCollection(ds.collections[0])
        const parent = ds.addCollection({ name: "parents" })
        ds.addAttribute({ name: "g" }, { collection: parent.id })
        const child = ds.addCollection({ name: "children" }, { after: parent.id })
        ds.addAttribute({ name: "x", formula: { display: "random()" } }, { collection: child.id })
        return ds
      })
      const gId = dataSet.attrIDFromName("g")!
      const spy = jest.spyOn(formulaManager, "recalculateFormulasInOrder")
      dataSet.addCases([{ __id__: "i1", [gId]: "A" }, { __id__: "i2", [gId]: "B" }])
      dataSet.validateCases()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
      expect(valuesOf(dataSet, dataSet.attrIDFromName("x")!).every(x => typeof x === "number")).toBe(true)
    })

    it("keeps random() values when the formulas are initialized after structure changes", () => {
      const formulaManager = new FormulaManager()
      const dataSet = createDataSet({
        attributes: [{ name: "g" }, { name: "h" }, { name: "v" }, { name: "r", formula: { display: "random()" } }]
      }, { formulaManager })
      const attrId = (name: string) => dataSet.attrIDFromName(name)!
      dataSet.addCases(groupItems.map(({ __id__, group }, i) => ({
        __id__, [attrId("g")]: group, [attrId("h")]: i % 2, [attrId("v")]: i
      })))
      formulaManager.addDataSet(dataSet)
      // these structure changes happen before the formulas are initialized
      dataSet.moveAttributeToNewCollection(attrId("g"))
      const parentId = dataSet.collections[0].id
      const childId = dataSet.collections[1].id
      dataSet.moveAttribute(attrId("r"), { collection: parentId })
      formulaManager.addAdapters([new AttributeFormulaAdapter(formulaManager.getAdapterApi())])
      const rBefore = valueMap(dataSet, attrId("r"))
      expect(Object.values(rBefore).every(r => typeof r === "number")).toBe(true)

      // the parent collection is unaffected by inserting a collection below it
      dataSet.moveAttributeToNewCollection(attrId("h"), childId)
      expect(valueMap(dataSet, attrId("r"))).toEqual(rBefore)
    })

    it("does not recalculate when attributes are reordered within a collection", () => {
      const { formulaManager, dataSet, attrId } = setupMeanOfRandom()
      const spy = jest.spyOn(formulaManager, "recalculateFormulasInOrder")
      const parentAttrIds = dataSet.collections[0].attributes.map(attr => attr!.id)
      expect(parentAttrIds).toEqual([attrId("group"), attrId("xbar")])
      dataSet.moveAttribute(attrId("xbar"), { before: attrId("group") })
      expect(dataSet.collections[0].attributes.map(attr => attr!.id)).toEqual([attrId("xbar"), attrId("group")])
      dataSet.validateCases()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it("stops observing a data set once it is destroyed", () => {
      const { formulaManager, dataSet } = setupMeanOfRandom()
      expect(formulaManager.hierarchyDisposers.has(dataSet.id)).toBe(true)
      const dataSetId = dataSet.id
      destroy(dataSet)
      expect(formulaManager.hierarchyDisposers.has(dataSetId)).toBe(false)
      expect(formulaManager.dataSets.has(dataSetId)).toBe(false)
    })

    it("stops observing a data set once it is removed", () => {
      const { formulaManager, dataSet, attrId, childId } = setupMeanOfRandom()
      formulaManager.removeDataSet(dataSet.id)
      const spy = jest.spyOn(formulaManager, "getHierarchyFormulaInfos")
      dataSet.moveAttribute(attrId("xbar"), { collection: childId })
      dataSet.validateCases()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe("undo and redo through the document", () => {
    beforeAll(() => {
      AttributeFormulaAdapter.register()
    })

    async function setupDocument() {
      const document = createCodapDocument()
      const treeManager = document.treeManagerAPI as Instance<typeof TreeManager>
      const undoManager = treeManager.undoManager
      const formulaManager = getFormulaManager(document) as FormulaManager
      await when(() => formulaManager.areAdaptersInitialized, { timeout: 1000 })
      const data = createDataSet({
        attributes: [
          { name: "g" }, { name: "h" }, { name: "v" },
          { name: "ci", formula: { display: "caseIndex" } },
          { name: "pv", formula: { display: "prev(v, 0)" } },
          { name: "mu", formula: { display: "mean(v)" } }
        ]
      })
      const attrId = (name: string) => data.attrIDFromName(name)!
      const items: ITestItem[] = [
        { __id__: "i1", g: "A", h: "x", v: 1 }, { __id__: "i2", g: "A", h: "y", v: 2 },
        { __id__: "i3", g: "A", h: "x", v: 3 }, { __id__: "i4", g: "B", h: "y", v: 4 },
        { __id__: "i5", g: "B", h: "x", v: 5 }
      ]
      data.addCases(items.map(({ __id__, ...values }) => ({
        __id__, ...Object.fromEntries(Object.entries(values).map(([name, value]) => [attrId(name), value]))
      })))
      const sharedDataSet = SharedDataSet.create()
      sharedDataSet.setDataSet(data)
      getSharedModelManager(document)!.addSharedModel(sharedDataSet)
      document.treeMonitor?.enableMonitoring()
      const whenReady = () => when(() => treeManager.activeHistoryEntries.length === 0, { timeout: 1000 })
      const expectAllCorrect = () => {
        ["ci", "pv", "mu"].forEach(name => expectOracle(formulaManager, data, attrId(name)))
      }
      const undoable = (change: () => void) =>
        data.applyModelChange(change, { undoStringKey: "Undo move", redoStringKey: "Redo move" })
      return { data, attrId, undoManager, whenReady, expectAllCorrect, undoable }
    }

    it("recalculates child formulas when undo and redo add or remove a middle collection", async () => {
      const { data, attrId, undoManager, whenReady, expectAllCorrect, undoable } = await setupDocument()
      undoable(() => data.moveAttributeToNewCollection(attrId("g")))
      await whenReady()
      expect(valuesOf(data, attrId("ci"))).toEqual([1, 2, 3, 1, 2])
      expectAllCorrect()

      const warn = jest.spyOn(console, "warn")
      const error = jest.spyOn(console, "error")
      const childId = data.collections[1].id
      // insert a middle collection, then undo and redo it
      undoable(() => data.moveAttributeToNewCollection(attrId("h"), childId))
      await whenReady()
      expect(data.collections.length).toBe(3)
      expectAllCorrect()
      undoManager?.undo()
      await whenReady()
      expect(data.collections.length).toBe(2)
      expect(valuesOf(data, attrId("ci"))).toEqual([1, 2, 3, 1, 2])
      expectAllCorrect()
      undoManager?.redo()
      await whenReady()
      expect(data.collections.length).toBe(3)
      expectAllCorrect()

      // remove the middle collection, then undo and redo that
      undoable(() => data.moveAttribute(attrId("h"), { collection: childId }))
      await whenReady()
      expect(data.collections.length).toBe(2)
      expectAllCorrect()
      undoManager?.undo()
      await whenReady()
      expect(data.collections.length).toBe(3)
      expectAllCorrect()
      undoManager?.redo()
      await whenReady()
      expect(data.collections.length).toBe(2)
      expect(valuesOf(data, attrId("ci"))).toEqual([1, 2, 3, 1, 2])
      expectAllCorrect()

      expect(warn).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      warn.mockRestore()
      error.mockRestore()
    })
  })

  it("move in an empty data set does not throw", () => {
    const { dataSet, attrId, parentId, childId } = setupMeanOfRandom(false, [])
    expect(() => {
      dataSet.moveAttribute(attrId("xbar"), { collection: childId })
      dataSet.moveAttribute(attrId("xbar"), { collection: parentId })
    }).not.toThrow()
    expect(dataSet.getCollectionForAttribute(attrId("xbar"))?.id).toBe(parentId)
    expect(dataSet.collections.map(collection => collection.caseIds.length)).toEqual([0, 0])
  })
})
