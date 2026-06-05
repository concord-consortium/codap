import { cloneDeep } from "lodash"
import { getSnapshot, Instance, types } from "mobx-state-tree"
import { onAnyAction, safeGetSnapshot } from "../../utilities/mst-utils"
import { ICategorySetSnapshot } from "../data/category-set"
import { DataSet } from "../data/data-set"
import {
  createDataSetMetadata, DataSetMetadata, ICollectionLabelsSnapshot, isDataSetMetadata,
  isNonEmptyCollectionLabels, isSetIsCollapsedAction
} from "./data-set-metadata"
import { SharedModel } from "./shared-model"

let mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  ...jest.requireActual("../../utilities/js-utils"),
  typedId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))

describe("DataSetMetadata", () => {

  const TreeModel = types.model("Tree", {
    data: DataSet,
    metadata: DataSetMetadata
  })

  let tree: Instance<typeof TreeModel>

  function addDefaultCases(bFn: (b: number) => number = b => b) {
    for (let a = 1; a <= 3; ++a) {
      for (let b = 1; b<= 3; ++b) {
        const _b = bFn(b)
        for (let c = 1; c <= 3; ++c) {
          tree.data.addCases([{ __id__: `${a}-${_b}-${c}`, aId: `${a}`, bId: `${_b}`, cId: `${c}` }])
        }
      }
    }
  }

  beforeEach(() => {
    mockNodeIdCount = 0

    tree = TreeModel.create({
      data: getSnapshot(DataSet.create()),
      metadata: getSnapshot(DataSetMetadata.create())
    })
    tree.data.addAttribute({ id: "aId", name: "a" })
    tree.data.addAttribute({ id: "bId", name: "b" })
    tree.data.addAttribute({ id: "cId", name: "c" })
    tree.metadata.setData(tree.data)
    addDefaultCases()
  })

  it("behaves appropriately without a DataSet", () => {
    const metadata = DataSetMetadata.create()
    const categories = metadata.getCategorySet("foo")
    expect(categories).toBeUndefined()
  })

  it("createDataSetMetadata creates a new instance with a provisional data set", () => {
    const data = DataSet.create()
    const metadata = createDataSetMetadata(data)
    expect(metadata.data).toBe(data)
  })

  it("implements isDataSetMetadata", () => {
    expect(isDataSetMetadata()).toBe(false)
    expect(isDataSetMetadata(SharedModel.create())).toBe(false)
    expect(isDataSetMetadata(tree.metadata)).toBe(true)
  })

  it("stores DataSet-level metadata", () => {
    expect(tree.metadata.description).toBeUndefined()
    expect(tree.metadata.source).toBeUndefined()
    expect(tree.metadata.importDate).toBeUndefined()
    expect(tree.metadata.hasDataContextMetadata).toBe(false)
    expect(tree.metadata.attrConfigChanged).toBeUndefined()
    expect(tree.metadata.isAttrConfigChanged).toBe(false)
    expect(tree.metadata.isAttrConfigProtected).toBe(false)

    tree.metadata.setDescription("foo")
    expect(tree.metadata.description).toBe("foo")
    tree.metadata.setSource("bar")
    expect(tree.metadata.source).toBe("bar")
    tree.metadata.setImportDate("baz")
    expect(tree.metadata.importDate).toBe("baz")
    expect(tree.metadata.hasDataContextMetadata).toBe(true)
    tree.metadata.setIsAttrConfigChanged(true)
    expect(tree.metadata.isAttrConfigChanged).toBe(true)
    tree.metadata.setIsAttrConfigProtected(true)
    expect(tree.metadata.isAttrConfigProtected).toBe(true)
  })

  it("stores collection labels", () => {
    tree.metadata.setCollectionLabels("aId", { singleCase: "single", pluralCase: "plural" })
    const collectionMetadata = tree.metadata.collections.get("aId")
    expect(collectionMetadata).toBeDefined()
    expect(collectionMetadata?.labels?.isEmpty).toBe(false)
    expect(collectionMetadata?.labels?.isNonEmpty).toBe(true)
    expect(isNonEmptyCollectionLabels(collectionMetadata?.labels)).toBe(true)
    expect(safeGetSnapshot(collectionMetadata?.labels)).toEqual({ singleCase: "single", pluralCase: "plural" })

    const allLabels: ICollectionLabelsSnapshot = {
      singleCase: "single",
      pluralCase: "plural",
      singleCaseWithArticle: "a single",
      setOfCases: "set",
      setOfCasesWithArticle: "a set"
    }
    tree.metadata.setCollectionLabels("aId", allLabels)
    expect(tree.metadata.collections.get("aId")?.labels?.isEmpty).toBe(false)
    expect(tree.metadata.collections.get("aId")?.labels?.isNonEmpty).toBe(true)
    expect(tree.metadata.collections.get("aId")?.labels).toEqual(allLabels)

    tree.metadata.removeCollectionLabels("aId")
    expect(tree.metadata.collections.get("aId")?.labels).toBeUndefined()
    tree.metadata.setSingleCase("aId", "single")
    expect(tree.metadata.collections.get("aId")?.labels).toEqual({ singleCase: "single"})

    tree.metadata.removeCollectionLabels("aId")
    expect(tree.metadata.collections.get("aId")?.labels).toBeUndefined()
    tree.metadata.setPluralCase("aId", "plural")
    expect(tree.metadata.collections.get("aId")?.labels).toEqual({ pluralCase: "plural"})

    tree.metadata.removeCollectionLabels("aId")
    expect(tree.metadata.collections.get("aId")?.labels).toBeUndefined()
    tree.metadata.setSingleCaseWithArticle("aId", "a single")
    expect(tree.metadata.collections.get("aId")?.labels).toEqual({ singleCaseWithArticle: "a single"})

    tree.metadata.removeCollectionLabels("aId")
    expect(tree.metadata.collections.get("aId")?.labels).toBeUndefined()
    tree.metadata.setSetOfCases("aId", "set")
    expect(tree.metadata.collections.get("aId")?.labels).toEqual({ setOfCases: "set"})

    tree.metadata.removeCollectionLabels("aId")
    expect(tree.metadata.collections.get("aId")?.labels).toBeUndefined()
    tree.metadata.setSetOfCasesWithArticle("aId", "a set")
    expect(tree.metadata.collections.get("aId")?.labels).toEqual({ setOfCasesWithArticle: "a set"})
  })

  it("stores hidden attributes", () => {
    expect(tree.metadata.isHidden("aId")).toBe(false)
    tree.metadata.setIsHidden("aId", true)
    expect(tree.metadata.isHidden("aId")).toBe(true)
    tree.metadata.setIsHidden("aId", false)
    expect(tree.metadata.isHidden("aId")).toBe(false)
    // falsy values are set to undefined
    expect(tree.metadata.attributes.get("aId")?.hidden).toBeUndefined()
    // can show all hidden attributes
    tree.metadata.setIsHidden("aId", true)
    expect(tree.metadata.isHidden("aId")).toBe(true)
    tree.metadata.showAllAttributes()
    expect(tree.metadata.isHidden("aId")).toBe(false)
    expect(tree.metadata.attributes.get("aId")?.hidden).toBeUndefined()

    // hiding every attribute in a collection leaves them all hidden (CODAP-1375): the case
    // table renders such a collection's grid with only the index column rather than auto-showing them.
    tree.metadata.setIsHidden("aId", true)
    tree.metadata.setIsHidden("bId", true)
    expect(tree.metadata.isHidden("aId")).toBe(true)
    expect(tree.metadata.isHidden("bId")).toBe(true)
    expect(tree.metadata.isHidden("cId")).toBe(false)

    tree.metadata.setIsHidden("cId", true)
    expect(tree.metadata.isHidden("aId")).toBe(true)
    expect(tree.metadata.isHidden("bId")).toBe(true)
    expect(tree.metadata.isHidden("cId")).toBe(true)

    // showAllAttributes() remains the way to recover them
    tree.metadata.showAllAttributes()
    expect(tree.metadata.isHidden("aId")).toBe(false)
    expect(tree.metadata.isHidden("bId")).toBe(false)
    expect(tree.metadata.isHidden("cId")).toBe(false)
  })

  it("stores attribute protections", () => {
    expect(tree.metadata.isEditProtected("aId")).toBe(false)
    expect(tree.metadata.isEditable("aId")).toBe(true)
    expect(tree.metadata.isDeleteProtected("aId")).toBe(false)
    expect(tree.metadata.isRenameProtected("aId")).toBe(false)

    tree.metadata.setIsEditProtected("aId", true)
    expect(tree.metadata.isEditProtected("aId")).toBe(true)
    expect(tree.metadata.isEditable("aId")).toBe(false)
    tree.metadata.setIsDeleteProtected("aId", true)
    expect(tree.metadata.isDeleteProtected("aId")).toBe(true)
    tree.metadata.setIsRenameProtected("aId", true)
    expect(tree.metadata.isRenameProtected("aId")).toBe(true)

    tree.metadata.setIsEditProtected("aId", false)
    expect(tree.metadata.isEditProtected("aId")).toBe(false)
    expect(tree.metadata.isEditable("aId")).toBe(true)
    tree.metadata.setIsDeleteProtected("aId", false)
    expect(tree.metadata.isDeleteProtected("aId")).toBe(false)
    tree.metadata.setIsRenameProtected("aId", false)
    expect(tree.metadata.isRenameProtected("aId")).toBe(false)
  })

  it("stores other attribute properties", () => {
    expect(tree.metadata.getAttributeColorRange("aId")).toEqual({low: "#f5e9e0", high: "#ff6800"})
    expect(tree.metadata.getAttributeDefaultRange("aId")).toBeUndefined()
    expect(tree.metadata.getAttributeBinningType("aId")).toBe("quantile")

    tree.metadata.setAttributeColor("aId", "#000000", "low")
    expect(tree.metadata.getAttributeColorRange("aId")).toEqual({ low: "#000000", high: "#ff6800" })
    tree.metadata.setAttributeColor("aId", "#ffffff", "high")
    expect(tree.metadata.getAttributeColorRange("aId")).toEqual({ low: "#000000", high: "#ffffff" })

    tree.metadata.setAttributeDefaultRange("aId", 0, 1)
    expect(tree.metadata.getAttributeDefaultRange("aId")).toEqual([0, 1])

    tree.metadata.setAttributeBinningType("aId", "quantize")
    expect(tree.metadata.getAttributeBinningType("aId")).toBe("quantize")
    tree.metadata.setAttributeBinningType("aId", "quantile")
    expect(tree.metadata.getAttributeBinningType("aId")).toBe("quantile")

    expect(tree.metadata.attributes.get("aId")?.deletedFormula).toBeUndefined()
    tree.metadata.setDeletedFormula("aId", "foo")
    expect(tree.metadata.attributes.get("aId")?.deletedFormula).toBe("foo")
  })

  it("stores legend range overrides per attribute", () => {
    // no override by default
    expect(tree.metadata.getAttributeLegendMin("aId")).toBeUndefined()
    expect(tree.metadata.getAttributeLegendMax("aId")).toBeUndefined()
    expect(tree.metadata.getAttributeLegendRange("aId")).toEqual({ min: undefined, max: undefined })

    // set min and max independently
    tree.metadata.setAttributeLegendMin("aId", 5)
    expect(tree.metadata.getAttributeLegendMin("aId")).toBe(5)
    expect(tree.metadata.getAttributeLegendMax("aId")).toBeUndefined()
    expect(tree.metadata.getAttributeLegendRange("aId")).toEqual({ min: 5, max: undefined })

    tree.metadata.setAttributeLegendMax("aId", 40)
    expect(tree.metadata.getAttributeLegendRange("aId")).toEqual({ min: 5, max: 40 })

    // overrides coexist with binningType in the same scale object
    tree.metadata.setAttributeBinningType("aId", "quantize")
    expect(tree.metadata.getAttributeBinningType("aId")).toBe("quantize")
    expect(tree.metadata.getAttributeLegendRange("aId")).toEqual({ min: 5, max: 40 })

    // different attributes hold independent overrides
    tree.metadata.setAttributeLegendMin("bId", -10)
    expect(tree.metadata.getAttributeLegendMin("bId")).toBe(-10)
    expect(tree.metadata.getAttributeLegendMin("aId")).toBe(5)

    // clearing a bound with undefined removes just that override
    tree.metadata.setAttributeLegendMin("aId", undefined)
    expect(tree.metadata.getAttributeLegendMin("aId")).toBeUndefined()
    expect(tree.metadata.getAttributeLegendMax("aId")).toBe(40)
    tree.metadata.setAttributeLegendMax("aId", undefined)
    expect(tree.metadata.getAttributeLegendRange("aId")).toEqual({ min: undefined, max: undefined })
  })

  it("does not create attribute metadata when clearing an unset legend bound", () => {
    expect(tree.metadata.attributes.get("cId")).toBeUndefined()
    tree.metadata.setAttributeLegendMin("cId", undefined)
    tree.metadata.setAttributeLegendMax("cId", undefined)
    expect(tree.metadata.attributes.get("cId")).toBeUndefined()
  })

  it("removes the scale node once it is left empty by clearing both legend bounds", () => {
    tree.metadata.setAttributeLegendMin("aId", 5)
    tree.metadata.setAttributeLegendMax("aId", 40)
    expect(tree.metadata.attributes.get("aId")?.scale).toBeDefined()

    // clearing both bounds leaves no scale fields set, so the scale node is removed entirely
    // rather than serialized as a stray empty `scale: {}` block
    tree.metadata.setAttributeLegendMin("aId", undefined)
    tree.metadata.setAttributeLegendMax("aId", undefined)
    expect(tree.metadata.attributes.get("aId")?.scale).toBeUndefined()
    expect((getSnapshot(tree.metadata).attributes as any).aId?.scale).toBeUndefined()
  })

  it("keeps the scale node when a binning type remains after clearing legend bounds", () => {
    tree.metadata.setAttributeBinningType("aId", "quantize")
    tree.metadata.setAttributeLegendMin("aId", 5)
    tree.metadata.setAttributeLegendMin("aId", undefined)
    // binningType is still set, so the scale node must survive
    expect(tree.metadata.attributes.get("aId")?.scale).toBeDefined()
    expect(tree.metadata.getAttributeBinningType("aId")).toBe("quantize")
  })

  it("serializes legend range overrides through a snapshot round-trip", () => {
    tree.metadata.setAttributeLegendMin("aId", 5)
    tree.metadata.setAttributeLegendMax("aId", 40)

    const snapshot = getSnapshot(tree.metadata)
    const restored = DataSetMetadata.create(cloneDeep(snapshot))
    expect(restored.getAttributeLegendRange("aId")).toEqual({ min: 5, max: 40 })
  })

  it("stores a per-attribute legend bin count", () => {
    expect(tree.metadata.getAttributeBinCount("aId")).toBeUndefined()
    tree.metadata.setAttributeBinCount("aId", 8)
    expect(tree.metadata.getAttributeBinCount("aId")).toBe(8)
  })

  it("clears the bin count and removes the scale node once it is empty", () => {
    tree.metadata.setAttributeBinCount("aId", 8)
    expect(tree.metadata.attributes.get("aId")?.scale).toBeDefined()
    tree.metadata.setAttributeBinCount("aId", undefined)
    expect(tree.metadata.getAttributeBinCount("aId")).toBeUndefined()
    expect(tree.metadata.attributes.get("aId")?.scale).toBeUndefined()
  })

  it("does not create attribute metadata when clearing an unset bin count", () => {
    expect(tree.metadata.attributes.get("cId")).toBeUndefined()
    tree.metadata.setAttributeBinCount("cId", undefined)
    expect(tree.metadata.attributes.get("cId")).toBeUndefined()
  })

  it("keeps the scale node when a bin count remains after clearing legend bounds", () => {
    tree.metadata.setAttributeBinCount("aId", 8)
    tree.metadata.setAttributeLegendMin("aId", 5)
    tree.metadata.setAttributeLegendMin("aId", undefined)
    expect(tree.metadata.attributes.get("aId")?.scale).toBeDefined()
    expect(tree.metadata.getAttributeBinCount("aId")).toBe(8)
  })

  it("responds appropriately when no DataSet is associated", () => {
    tree.metadata.setData()
    // ignores collapse calls before DataSet is associated
    expect(tree.metadata.isCollapsed("foo")).toBe(false)
    tree.metadata.setIsCollapsed("foo", true)
    expect(tree.metadata.isCollapsed("foo")).toBe(false)
    // ignores category set calls before DataSet is associated
    const categories = tree.metadata.getCategorySet("foo")
    expect(categories).toBeUndefined()
  })

  it("stores expand/collapse state for cases", () => {
    // ignores invalid ids
    expect(tree.metadata.isCollapsed("foo")).toBe(false)
    tree.metadata.setIsCollapsed("foo", true)
    expect(tree.metadata.isCollapsed("foo")).toBe(false)
    // move attr "a" to a new collection (["aId"], ["bId", "cId"])
    tree.data.moveAttributeToNewCollection("aId")
    const collection = tree.data.collections[0]
    const cases = tree.data.getCasesForAttributes(["aId"])
    const case0 = cases[0]
    expect(tree.metadata.isCollapsed(case0.__id__)).toBe(false)
    tree.metadata.setIsCollapsed(case0.__id__, true)
    expect(tree.metadata.isCollapsed(case0.__id__)).toBe(true)
    tree.metadata.setIsCollapsed(case0.__id__, false)
    expect(tree.metadata.isCollapsed(case0.__id__)).toBe(false)
    expect(tree.metadata.collections.size).toBe(1)
    expect(tree.metadata.collections.get(collection.id)?.collapsed.size).toBe(0)
    // move attr "a" back to child collection
    tree.data.moveAttribute("aId", { collection: tree.data.collections[1].id })
    expect(tree.metadata.collections.size).toBe(0)
  })

  it("stores expand/collapse state for cases in hierarchical data sets", () => {
    // create hierarchical data set
    const cCollection = tree.data.childCollection
    // move attr "b" to a new collection (["bId"], ["aId", "cId"])
    const bCollection = tree.data.moveAttributeToNewCollection("bId")!
    // move attr "a" to a new collection (["aId"], ["bId"], ["cId"])
    const aCollection = tree.data.moveAttributeToNewCollection("aId", bCollection.id)!
    tree.data.validateCases()
    const aCases = aCollection.cases
    const bCases = bCollection.cases
    const cCases = cCollection.cases
    const hash0 = tree.metadata.collapsedCaseIdsHash
    expect(tree.metadata.isCaseOrAncestorCollapsed(aCases[0].__id__)).toBe(false)
    tree.metadata.setIsCollapsed(aCases[0].__id__, true)
    const hash1 = tree.metadata.collapsedCaseIdsHash
    expect(hash1).not.toBe(hash0)
    expect(tree.metadata.isCollapsed(aCases[0].__id__)).toBe(true)
    expect(tree.metadata.isCaseOrAncestorCollapsed(aCases[0].__id__)).toBe(true)
    expect(tree.metadata.getCollapsedAncestor(aCases[0].__id__)).toBeUndefined()
    expect(tree.metadata.isCollapsed(bCases[0].__id__)).toBe(false)
    expect(tree.metadata.isCaseOrAncestorCollapsed(bCases[0].__id__)).toBe(true)
    expect(tree.metadata.getCollapsedAncestor(bCases[0].__id__)).toBe(aCases[0].__id__)
    expect(tree.metadata.isFirstCaseOfAncestor(bCases[0].__id__, aCases[0].__id__)).toBe(true)
    expect(tree.metadata.isFirstCaseOfAncestor(bCases[1].__id__, aCases[0].__id__)).toBe(false)
    const abDescendantIds = tree.metadata.getDescendantCaseIds(aCases[0].__id__, bCases[0].__id__)
    expect(abDescendantIds.length).toBe(3)
    expect(abDescendantIds).toEqual([bCases[0].__id__, bCases[1].__id__, bCases[2].__id__])
    expect(tree.metadata.isCollapsed(cCases[0].__id__)).toBe(false)
    expect(tree.metadata.isCaseOrAncestorCollapsed(cCases[0].__id__)).toBe(true)
    expect(tree.metadata.getCollapsedAncestor(cCases[0].__id__)).toBe(aCases[0].__id__)
    expect(tree.metadata.isFirstCaseOfAncestor(cCases[0].__id__, aCases[0].__id__)).toBe(true)
    expect(tree.metadata.isFirstCaseOfAncestor(cCases[1].__id__, aCases[0].__id__)).toBe(false)
    const acDescendantIds = tree.metadata.getDescendantCaseIds(aCases[0].__id__, cCases[0].__id__)
    expect(acDescendantIds.length).toBe(9)
    expect(acDescendantIds.includes(cCases[0].__id__)).toBe(true)
    expect(acDescendantIds.includes(cCases[8].__id__)).toBe(true)
    expect(acDescendantIds.includes(cCases[9].__id__)).toBe(false)
    // edge cases
    expect(tree.metadata.isFirstCaseOfAncestor(aCases[0].__id__, cCases[0].__id__)).toBe(false)
    const caDescendantIds = tree.metadata.getDescendantCaseIds(cCases[0].__id__, aCases[0].__id__)
    expect(caDescendantIds).toEqual([])
    // expanding a child case expands its parents/ancestors
    tree.metadata.setIsCollapsed(cCases[0].__id__, false)
    expect(tree.metadata.isCollapsed(aCases[0].__id__)).toBe(false)
    expect(tree.metadata.isCollapsed(bCases[0].__id__)).toBe(false)
    expect(tree.metadata.isCollapsed(cCases[0].__id__)).toBe(false)
    const hash2 = tree.metadata.collapsedCaseIdsHash
    expect(hash2).not.toBe(hash1)
    expect(hash2).toBe(hash0)
  })

  it("recognizes SetIsCollapsedActions", () => {
    const counter = jest.fn()
    onAnyAction(tree.metadata, action => {
      if (isSetIsCollapsedAction(action)) {
        counter()
      }
    })
    const cases = tree.data.getCasesForAttributes(["aId"])
    const case0 = cases[0]
    expect(tree.metadata.isCollapsed(case0.__id__)).toBe(false)
    tree.metadata.setIsCollapsed(case0.__id__, true)
    expect(counter).toHaveBeenCalledTimes(1)
  })

  it("supports CategorySets", () => {
    expect(tree.metadata.attributes.size).toBe(0)
    expect(tree.metadata.attributes.get("aId")).toBeUndefined()
    const set1 = tree.metadata.getCategorySet("aId")
    expect(tree.metadata.attributes.size).toBe(0)
    expect(tree.metadata.provisionalCategories.size).toBe(1)
    expect(tree.metadata.provisionalCategories.get("aId")).toBe(set1)
    const set2 = tree.metadata.getCategorySet("aId")
    expect(tree.metadata.provisionalCategories.size).toBe(1)
    expect(tree.metadata.provisionalCategories.get("aId")).toBe(set1)
    expect(set1).toBe(set2)
    const noSet = tree.metadata.getCategorySet("zId")
    expect(noSet).toBeUndefined()
    expect(tree.metadata.attributes.size).toBe(0)
    expect(tree.metadata.provisionalCategories.size).toBe(1)
    expect(tree.metadata.attributes.get("zId")).toBeUndefined()
    expect(tree.metadata.provisionalCategories.get("zId")).toBeUndefined()

    const bSet = tree.metadata.getCategorySet("bId")
    expect(tree.metadata.attributes.size).toBe(0)
    expect(tree.metadata.provisionalCategories.size).toBe(2)
    expect(tree.metadata.provisionalCategories.get("bId")).toBe(bSet)

    // promotes provisional category sets when modified
    set1!.setColorForCategory("1", "red")
    expect(set1!.colorForCategory("1")).toBe("red")
    expect(tree.metadata.attributes.size).toBe(1)
    expect(tree.metadata.provisionalCategories.size).toBe(1)
    expect(tree.metadata.getCategorySet("aId")?.colorForCategory("1")).toBe("red")

    // can replace category set with updated snapshot
    const set1Snap = cloneDeep(getSnapshot(tree.metadata.getCategorySet("aId")!)) as ICategorySetSnapshot
    set1Snap.colors!["2"] = "blue" // set color for category "1"
    tree.metadata.setCategorySet("aId", set1Snap)
    expect(tree.metadata.getCategorySet("aId")?.colorForCategory("1")).toBe("red")
    expect(tree.metadata.getCategorySet("aId")?.colorForCategory("2")).toBe("blue")

    // removes set from map when its attribute is invalidated
    tree.data.removeAttribute("aId")
    expect(tree.metadata.attributes.size).toBe(0)
    expect(tree.metadata.provisionalCategories.size).toBe(1)
    tree.data.removeAttribute("bId")
    expect(tree.metadata.attributes.size).toBe(0)
    expect(tree.metadata.provisionalCategories.size).toBe(0)
  })

  it("supports attribute color range models", () => {
    expect(tree.metadata.attributes.size).toBe(0)

    // Set color range
    tree.metadata.setAttributeColor("aId", "#000000", "low")
    expect(tree.metadata.attributes.size).toBe(1)
    expect(tree.metadata.getAttributeColorRange("aId")?.low).toBe("#000000")
    tree.metadata.setAttributeColor("aId", "#ffffff", "high")
    expect(tree.metadata.attributes.size).toBe(1)
    expect(tree.metadata.getAttributeColorRange("aId")?.high).toBe("#ffffff")

    // Remove attribute and check color range is removed
    tree.data.removeAttribute("aId")
    expect(tree.metadata.attributes.size).toBe(0)
  })

  it("supports attribute binning types", () => {
    expect(tree.metadata.attributes.size).toBe(0)

    // Set binning types
    tree.metadata.setAttributeBinningType("aId", "quantize")
    expect(tree.metadata.attributes.size).toBe(1)
    expect(tree.metadata.getAttributeBinningType("aId")).toBe("quantize")

    tree.metadata.setAttributeBinningType("aId", "quantile")
    expect(tree.metadata.attributes.size).toBe(1)
    expect(tree.metadata.getAttributeBinningType("aId")).toBe("quantile")

    // Remove attribute and check binning type is removed
    tree.data.removeAttribute("aId")
    expect(tree.metadata.attributes.size).toBe(0)
  })

  it("supports case table and case card id management", () => {
    expect(tree.metadata.caseTableTileId).toBeUndefined()
    expect(tree.metadata.caseCardTileId).toBeUndefined()
    expect(tree.metadata.lastShownTableOrCardTileId).toBeUndefined()

    tree.metadata.setCaseTableTileId("foo-table")
    tree.metadata.setCaseCardTileId("foo-card")
    tree.metadata.setLastShownTableOrCardTileId("foo-table")

    expect(tree.metadata.caseTableTileId).toBe("foo-table")
    expect(tree.metadata.caseCardTileId).toBe("foo-card")
    expect(tree.metadata.lastShownTableOrCardTileId).toBe("foo-table")
  })
})
