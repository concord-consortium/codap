import { getSnapshot, Instance, types } from "mobx-state-tree"
import { DataSet } from "../data/data-set"
import { getCategorySet, isSharedCaseMetadata, SharedCaseMetadata } from "./shared-case-metadata"
import { SharedModel } from "./shared-model"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  typedId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))

describe("SharedCaseMetadata", () => {

  const TreeModel = types.model("Tree", {
    data: DataSet,
    metadata: SharedCaseMetadata
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
      metadata: getSnapshot(SharedCaseMetadata.create())
    })
    tree.data.addAttribute({ id: "aId", name: "a" })
    tree.data.addAttribute({ id: "bId", name: "b" })
    tree.data.addAttribute({ id: "cId", name: "c" })
    tree.metadata.setData(tree.data)
    addDefaultCases()
  })

  it("implements isSharedCaseMetadata", () => {
    expect(isSharedCaseMetadata()).toBe(false)
    expect(isSharedCaseMetadata(SharedModel.create())).toBe(false)
    expect(isSharedCaseMetadata(tree.metadata)).toBe(true)
  })

  it("stores column widths and hidden attributes", () => {
    expect(tree.metadata.columnWidth("foo")).toBeUndefined()
    expect(tree.metadata.isHidden("foo")).toBe(false)
    tree.metadata.setColumnWidth("foo", 10)
    tree.metadata.setIsHidden("foo", true)
    expect(tree.metadata.columnWidth("foo")).toBe(10)
    expect(tree.metadata.isHidden("foo")).toBe(true)
    tree.metadata.setColumnWidth("foo")
    tree.metadata.setIsHidden("foo", false)
    expect(tree.metadata.columnWidth("foo")).toBeUndefined()
    expect(tree.metadata.isHidden("foo")).toBe(false)
    // falsy values are removed from map
    expect(tree.metadata.columnWidths.size).toBe(0)
    expect(tree.metadata.hidden.size).toBe(0)
    // can show all hidden attributes
    tree.metadata.setIsHidden("foo", true)
    expect(tree.metadata.isHidden("foo")).toBe(true)
    tree.metadata.showAllAttributes()
    expect(tree.metadata.isHidden("foo")).toBe(false)
    expect(tree.metadata.hidden.size).toBe(0)
  })

  it("responds appropriately when no DataSet is associated", () => {
    tree.metadata.setData()
    // ignores collapse calls before DataSet is associated
    expect(tree.metadata.isCollapsed("foo")).toBe(false)
    tree.metadata.setIsCollapsed("foo", true)
    expect(tree.metadata.isCollapsed("foo")).toBe(false)
    // ignores category set calls before DataSet is associated
    const categories = getCategorySet(tree.metadata, "foo")
    expect(categories).toBeUndefined()
  })

  it("stores collapsed pseudo-cases", () => {
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
  })

  it("supports CategorySets", () => {
    expect(tree.metadata.categories.size).toBe(0)
    expect(tree.metadata.categories.get("aId")).toBeUndefined()
    const set1 = getCategorySet(tree.metadata, "aId")
    expect(tree.metadata.categories.size).toBe(1)
    expect(tree.metadata.categories.get("aId")).toBe(set1)
    const set2 = getCategorySet(tree.metadata, "aId")
    expect(tree.metadata.categories.size).toBe(1)
    expect(tree.metadata.categories.get("aId")).toBe(set1)
    expect(set1).toBe(set2)
    const noSet = getCategorySet(tree.metadata, "zId")
    expect(noSet).toBeUndefined()
    expect(tree.metadata.categories.size).toBe(1)
    expect(tree.metadata.categories.get("zId")).toBeUndefined()
    // removes set from map when its attribute is invalidated
    tree.data.removeAttribute("aId")
    expect(tree.metadata.categories.size).toBe(0)
  })
})
