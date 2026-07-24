import { createDataSet } from "../../data/data-set-conversion"
import { AttributeFormulaAdapter } from "../attribute-formula-adapter"
import { FormulaManager } from "../formula-manager"

// Regression test for percentile() evaluated in a parent collection while referencing a child-collection attribute.
// percentile() caches its sorted per-group values; the cache key must distinguish parent case groups. Keying on the
// same-level group id (rather than the aggregate group id) collapsed every top-level parent group to a single key,
// so the first group's sorted values leaked into the others and every group reported the first group's percentile.

// Builds a two-level hierarchy: a parent "group" collection over a child collection holding `value`. Each entry in
// `groups` becomes one parent case whose children hold that group's `values`. The parent-level formula attributes
// reference the child `value` attribute, so they are evaluated once per parent group.
const buildHierarchy = (
  formulaAttrs: Array<{ name: string, display: string }>,
  groups: Array<{ name: string, values: number[] }>
) => {
  const formulaManager = new FormulaManager()
  const dataSet = createDataSet({
    attributes: [
      { id: "group", name: "group" },
      { id: "value", name: "value" },
      ...formulaAttrs.map(({ name, display }) => ({ id: name, name, formula: { display } }))
    ]
  }, { formulaManager })

  // Cases must use canonical (attribute-ID-keyed) format; here the ids match the attribute names.
  const cases = groups.flatMap(({ name, values }) =>
    values.map((value, i) => ({ __id__: `${name}${i}`, group: name, value }))
  )
  dataSet.addCases(cases)

  const adapter = new AttributeFormulaAdapter(formulaManager.getAdapterApi())
  formulaManager.addDataSet(dataSet)
  formulaManager.addAdapters([adapter])

  // Move `group` and the formula attributes into a parent collection, leaving `value` in the child collection.
  const parentCollection = dataSet.moveAttributeToNewCollection(dataSet.attrIDFromName("group")!)!
  formulaAttrs.forEach(({ name }) => {
    dataSet.moveAttribute(dataSet.attrIDFromName(name)!, { collection: parentCollection.id })
  })

  // Recalculate now that the hierarchy is in place, so each parent group evaluates its own child cases.
  formulaManager.recalculateActiveFormulas()

  return dataSet
}

describe("percentile() in a hierarchical (parent-child) context", () => {
  it("computes per-group results without cache collisions (CODAP-1464)", () => {
    // Group A: 16 cases of value 10; group B: 24 cases of value -10. Item 0 is in group A, item 16 in group B.
    const dataSet = buildHierarchy(
      [
        { name: "medV", display: "median(value)" },
        { name: "ptileV", display: "percentile(value, 0.5)" }
      ],
      [
        { name: "A", values: Array(16).fill(10) },
        { name: "B", values: Array(24).fill(-10) }
      ]
    )
    const medV = dataSet.attrIDFromName("medV")!
    const ptileV = dataSet.attrIDFromName("ptileV")!

    // median (unaffected by the bug) establishes the expected per-group values.
    expect(dataSet.getValueAtItemIndex(0, medV)).toEqual(10)
    expect(dataSet.getValueAtItemIndex(16, medV)).toEqual(-10)

    // percentile must match median for p = 0.5; group B previously leaked group A's cached value (10).
    expect(dataSet.getValueAtItemIndex(0, ptileV)).toEqual(10)
    expect(dataSet.getValueAtItemIndex(16, ptileV)).toEqual(-10)
  })

  it("computes distinct percentiles across three groups with differing spreads", () => {
    // Each group holds a different spread of values, so its 25th percentile is a genuine position within its own
    // sorted distribution (interpolated when the index falls between two values). Distinct per-group results confirm
    // each group caches its own sorted values, independent of evaluation order.
    const dataSet = buildHierarchy(
      [{ name: "q1", display: "percentile(value, 0.25)" }],
      [
        // q1 index = (n - 1) * 0.25
        { name: "A", values: [0, 4, 8, 12] },            // index 0.75 -> 0.75*4 + 0.25*0 = 3
        { name: "B", values: [100, 200, 300, 400, 500] }, // index 1.0  -> exactly 200
        { name: "C", values: [20, 40, 60] }              // index 0.5  -> 0.5*40 + 0.5*20 = 30
      ]
    )
    const q1 = dataSet.attrIDFromName("q1")!

    expect(dataSet.getValueAtItemIndex(0, q1)).toEqual(3)    // group A (items 0-3)
    expect(dataSet.getValueAtItemIndex(4, q1)).toEqual(200)  // group B (items 4-8)
    expect(dataSet.getValueAtItemIndex(9, q1)).toEqual(30)   // group C (items 9-11)
  })
})
