import { recordPatches } from "mobx-state-tree"
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

// Deterministic formulas: a fresh recalculation must not change the stored values.
function expectOracle(formulaManager: FormulaManager, dataSet: IDataSet, attrId: string) {
  const before = valuesOf(dataSet, attrId)
  formulaManager.recalculateFormula(formulaIdOf(dataSet, attrId))
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

  it("undo of a move leaves x unchanged and xbar correct", () => {
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
    const { dataSet, adapter, attrId } = env
    dataSet.moveAttributeToNewCollection(attrId("group"))
    const parentId = dataSet.collections[0].id
    const childId = dataSet.collections[1].id
    dataSet.moveAttribute(attrId("n"), { collection: parentId })
    dataSet.moveAttribute(attrId("m"), { collection: parentId })

    it("recalculates count() and its dependent when a collection is inserted", () => {
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

  it("move in an empty data set does not throw", () => {
    const { dataSet, attrId, parentId, childId } = setupReportedCase(false, [])
    expect(() => {
      dataSet.moveAttribute(attrId("xbar"), { collection: childId })
      dataSet.moveAttribute(attrId("xbar"), { collection: parentId })
    }).not.toThrow()
  })
})
