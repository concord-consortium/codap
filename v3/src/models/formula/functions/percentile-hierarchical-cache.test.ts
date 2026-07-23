import { createDataSet } from "../../data/data-set-conversion"
import { AttributeFormulaAdapter } from "../attribute-formula-adapter"
import { FormulaManager } from "../formula-manager"

// Regression test for percentile() evaluated in a parent collection while referencing a child-collection attribute.
// percentile() caches its sorted per-group values; the cache key must distinguish parent case groups. Keying on the
// same-level group id (rather than the aggregate group id) collapsed every top-level parent group to a single key,
// so the first group's sorted values leaked into the others and every group reported the first group's percentile.

// Builds a two-level hierarchy: a parent "group" collection over a child collection holding `value`. Each entry in
// `groups` becomes one parent case whose children all share that group's value. The parent-level formula attributes
// reference the child `value` attribute, so they are evaluated once per parent group.
const buildHierarchy = (
  formulaAttrs: Array<{ name: string, display: string }>,
  groups: Array<{ name: string, value: number, count: number }>
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
  const cases = groups.flatMap(({ name, value, count }) =>
    Array.from({ length: count }, (_, i) => ({ __id__: `${name}${i}`, group: name, value }))
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
        { name: "A", value: 10, count: 16 },
        { name: "B", value: -10, count: 24 }
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
    // Three groups with distinct value ranges confirm each group caches its own sorted values, independent of
    // evaluation order. Each group's 25th percentile falls a quarter of the way through its own sorted values.
    const dataSet = buildHierarchy(
      [{ name: "q1", display: "percentile(value, 0.25)" }],
      [
        { name: "A", value: 100, count: 5 },  // all 100 -> q1 = 100
        { name: "B", value: 200, count: 5 },  // all 200 -> q1 = 200
        { name: "C", value: 300, count: 5 }   // all 300 -> q1 = 300
      ]
    )
    const q1 = dataSet.attrIDFromName("q1")!

    expect(dataSet.getValueAtItemIndex(0, q1)).toEqual(100)   // group A
    expect(dataSet.getValueAtItemIndex(5, q1)).toEqual(200)   // group B
    expect(dataSet.getValueAtItemIndex(10, q1)).toEqual(300)  // group C
  })
})
