import { reaction } from "mobx"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { toCanonical } from "../../models/data/data-set"
import { linkTileToDataSet } from "../../models/document/data-set-linking"
import { DataSetMetadata } from "../../models/shared/data-set-metadata"
import { SharedDataSet } from "../../models/shared/shared-data-set"
import { TileModel } from "../../models/tiles/tile-model"
import { CaseCardModel } from "./case-card-model"
import "./case-card-registration"

function setupCardWithDataSet() {
  const document = createCodapDocument(undefined, { noGlobals: true })
  const cardContent = CaseCardModel.create()
  const tile = TileModel.create({ content: cardContent })
  document.addTile(tile)
  const sharedDataSet = SharedDataSet.create()
  document.content?.addSharedModel(sharedDataSet)
  const sharedMetadata = DataSetMetadata.create()
  document.content?.addSharedModel(sharedMetadata)
  sharedMetadata.setData(sharedDataSet.dataSet)
  linkTileToDataSet(tile, sharedDataSet.dataSet)
  return { cardContent, data: sharedDataSet.dataSet }
}

describe("CaseCardModel reactivity", () => {
  // CODAP-1290: Case card value displays don't update when values change externally
  // (e.g. computed values updated by dragging a slider). The summarizedValues view
  // must establish a MobX dependency that fires when underlying attribute values
  // mutate so observers re-render.
  it("summarizedValues reacts to numeric attribute value mutations", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const xAttr = data.addAttribute({ name: "x" })
    data.addCases(toCanonical(data, [{ x: 1 }, { x: 2 }, { x: 3 }]))
    data.validateCases()
    const collection = data.collections[0]

    const summaryListener = jest.fn()
    const dispose = reaction(
      () => cardContent.summarizedValues(xAttr, collection),
      () => summaryListener()
    )

    expect(cardContent.summarizedValues(xAttr, collection)).toBe("1-3")
    expect(summaryListener).toHaveBeenCalledTimes(0)

    // Simulate a slider-driven formula recompute mutating one case's value.
    const firstCaseId = data.items[0].__id__
    data.setComputedCaseValues([{ __id__: firstCaseId, [xAttr.id]: 99 }], [xAttr.id])

    expect(cardContent.summarizedValues(xAttr, collection)).toBe("2-99")
    expect(summaryListener).toHaveBeenCalledTimes(1)

    dispose()
  })

  it("summarizedValues reacts to categorical attribute value mutations", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const cAttr = data.addAttribute({ name: "color" })
    data.addCases(toCanonical(data, [{ color: "red" }, { color: "red" }, { color: "blue" }]))
    data.validateCases()
    const collection = data.collections[0]

    const summaryListener = jest.fn()
    const dispose = reaction(
      () => cardContent.summarizedValues(cAttr, collection),
      () => summaryListener()
    )

    expect(cardContent.summarizedValues(cAttr, collection)).toBe("red, blue")
    expect(summaryListener).toHaveBeenCalledTimes(0)

    const lastCaseId = data.items[2].__id__
    data.setComputedCaseValues([{ __id__: lastCaseId, [cAttr.id]: "green" }], [cAttr.id])

    expect(cardContent.summarizedValues(cAttr, collection)).toBe("red, green")
    expect(summaryListener).toHaveBeenCalledTimes(1)

    dispose()
  })
})

describe("CaseCardModel summarizedValues hierarchical filtering", () => {
  // Build a two-level hierarchy (parent "group" / child "value") from the given rows.
  function setupHierarchy(rows: Array<{ group: string, value: number | string }>) {
    const { cardContent, data } = setupCardWithDataSet()
    const groupAttr = data.addAttribute({ name: "group" })
    const valueAttr = data.addAttribute({ name: "value" })
    data.addCases(toCanonical(data, rows))
    data.moveAttributeToNewCollection(groupAttr.id)
    data.validateCases()
    const [parentCollection, childCollection] = data.collections
    const parentByGroup = (group: string) =>
      data.getCasesForCollection(parentCollection.id)
        .find(c => data.getStrValue(c.__id__, groupAttr.id) === group)!
    return { cardContent, data, groupAttr, valueAttr, childCollection, parentByGroup }
  }

  const numericRows = [
    { group: "A", value: 1 },
    { group: "A", value: 5 },
    { group: "B", value: 10 },
    { group: "B", value: 20 }
  ]
  const categoricalRows = [
    { group: "A", value: "red" },
    { group: "A", value: "blue" },
    { group: "B", value: "green" },
    { group: "B", value: "green" }
  ]

  // With no selection (the global "Summarize Dataset" state), the child summary covers the
  // entire child collection, matching legacy v2.
  it("summarizes the entire child collection when nothing is selected (numeric)", () => {
    const { cardContent, data, valueAttr, childCollection } = setupHierarchy(numericRows)
    expect(data.selection.size).toBe(0)
    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("1-20")
  })

  it("summarizes the entire child collection when nothing is selected (categorical)", () => {
    const { cardContent, valueAttr, childCollection } = setupHierarchy(categoricalRows)
    // red, blue, green => 3 distinct values
    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("3 values")
  })

  // When a parent case is viewed (selected, which selects its descendants), the child
  // summary reflects only that parent's children.
  it("restricts the child summary to the children of the selected parent (numeric)", () => {
    const { cardContent, data, valueAttr, childCollection, parentByGroup } = setupHierarchy(numericRows)

    data.setSelectedCases([parentByGroup("A").__id__])
    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("1-5")

    data.setSelectedCases([parentByGroup("B").__id__])
    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("10-20")
  })

  it("restricts the child summary to the children of the selected parent (categorical)", () => {
    const { cardContent, data, valueAttr, childCollection, parentByGroup } = setupHierarchy(categoricalRows)

    data.setSelectedCases([parentByGroup("A").__id__])
    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("red, blue")

    data.setSelectedCases([parentByGroup("B").__id__])
    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("green")
  })

  // A subset selection within the viewed parent narrows the summary further.
  it("restricts the child summary to a selected subset of children", () => {
    const { cardContent, data, valueAttr, childCollection, parentByGroup } = setupHierarchy([
      { group: "A", value: 1 },
      { group: "A", value: 5 },
      { group: "A", value: 9 },
      { group: "B", value: 100 }
    ])

    const groupAChildren = cardContent.groupChildCases(parentByGroup("A").__id__) ?? []
    const subset = groupAChildren.filter(c => {
      const v = data.getNumeric(c.__id__, valueAttr.id)
      return v === 1 || v === 5
    })
    data.setSelectedCases(subset.map(c => c.__id__))

    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("1-5")
  })

  // Selecting a childmost (leaf) case feeds an ANCESTOR collection's summary from the cases
  // on the path to that selection (v2's getParentsOfChildmostSelection), not the whole
  // collection. This exercises isAnyChildItemSelected on non-leaf collections.
  it("feeds an ancestor collection's summary from the path to a selected leaf case", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const g1Attr = data.addAttribute({ name: "g1" })
    const g2Attr = data.addAttribute({ name: "g2" })
    const valueAttr = data.addAttribute({ name: "value" })
    data.addCases(toCanonical(data, [
      { g1: "A", g2: "X", value: 1 },
      { g1: "A", g2: "X", value: 2 },
      { g1: "A", g2: "Y", value: 3 },
      { g1: "B", g2: "Z", value: 100 }
    ]))
    // Build a three-level hierarchy: [g1] / [g2] / [value]
    data.addCollection({ attributes: [g1Attr.id] })
    data.addCollection({ attributes: [g2Attr.id] })
    data.validateCases()
    const [g1Collection, g2Collection, valueCollection] = data.collections

    // with no selection, each collection summarizes globally
    expect(cardContent.summarizedValues(g1Attr, g1Collection)).toBe("A, B")
    expect(cardContent.summarizedValues(g2Attr, g2Collection)).toBe("3 values") // X, Y, Z
    expect(cardContent.summarizedValues(valueAttr, valueCollection)).toBe("1-100")

    // select two leaf cases, both under g1="A" / g2="X"
    const leaves = data.getCasesForCollection(valueCollection.id).filter(c => {
      const v = data.getNumeric(c.__id__, valueAttr.id)
      return v === 1 || v === 2
    })
    data.setSelectedCases(leaves.map(c => c.__id__))

    // ancestors reflect only the path to the selection, not the whole collection
    expect(cardContent.summarizedValues(g1Attr, g1Collection)).toBe("A")
    expect(cardContent.summarizedValues(g2Attr, g2Collection)).toBe("X")
    expect(cardContent.summarizedValues(valueAttr, valueCollection)).toBe("1-2")
  })

  // The summary is reactive: it recomputes when the selection changes (the case card cell
  // is a MobX observer and must re-render as the user navigates).
  it("reacts to selection changes", () => {
    const { cardContent, data, valueAttr, childCollection, parentByGroup } = setupHierarchy(numericRows)

    const listener = jest.fn()
    const dispose = reaction(
      () => cardContent.summarizedValues(valueAttr, childCollection),
      () => listener()
    )

    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("1-20")
    expect(listener).toHaveBeenCalledTimes(0)

    data.setSelectedCases([parentByGroup("A").__id__])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(cardContent.summarizedValues(valueAttr, childCollection)).toBe("1-5")

    dispose()
  })
})

describe("CaseCardModel summarizedValues selection and edge cases", () => {
  // In a flat (single-collection) dataset, selecting a subset narrows the summary to it.
  it("restricts a flat summary to the selected subset of cases", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const xAttr = data.addAttribute({ name: "x" })
    data.addCases(toCanonical(data, [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }]))
    data.validateCases()
    const collection = data.collections[0]

    // no selection -> all cases
    expect(cardContent.summarizedValues(xAttr, collection)).toBe("1-4")

    // select x=2 and x=3
    const subset = data.getCasesForCollection(collection.id).filter(c => {
      const v = data.getNumeric(c.__id__, xAttr.id)
      return v === 2 || v === 3
    })
    data.setSelectedCases(subset.map(c => c.__id__))
    expect(cardContent.summarizedValues(xAttr, collection)).toBe("2-3")
  })

  // Empty values are excluded from a categorical summary (matching v2 and the numeric branch).
  it("excludes empty values from a categorical summary", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const cAttr = data.addAttribute({ name: "color" })
    data.addCases(toCanonical(data, [{ color: "red" }, { color: "" }, { color: "blue" }]))
    data.validateCases()
    const collection = data.collections[0]

    // the blank value is ignored; only "red" and "blue" are summarized
    expect(cardContent.summarizedValues(cAttr, collection)).toBe("red, blue")
  })

  // When the summarized cases have no finite numeric values, the numeric summary is empty.
  it("returns an empty numeric summary when the selected cases have no numeric values", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const xAttr = data.addAttribute({ name: "x" })
    data.addCases(toCanonical(data, [{ x: 1 }, { x: 2 }, { x: 3 }, { x: "" }]))
    data.validateCases()
    const collection = data.collections[0]
    expect(xAttr.isNumeric).toBe(true)

    const blankCase = data.getCasesForCollection(collection.id)
      .find(c => !data.getStrValue(c.__id__, xAttr.id))!
    data.setSelectedCases([blankCase.__id__])
    expect(cardContent.summarizedValues(xAttr, collection)).toBe("")
  })
})
