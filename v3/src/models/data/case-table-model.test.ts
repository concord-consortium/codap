import { CaseTableModel, isCaseTableModel } from "../../components/case-table/case-table-model"
import { TileContentModel } from "../tiles/tile-content"
import { DataSet, IDataSet } from "./data-set"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  uniqueId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))

describe("CaseTableModel", () => {
  let data: IDataSet

  function addDefaultCases(bFn: (b: number) => number = b => b) {
    for (let a = 1; a <= 3; ++a) {
      for (let b = 1; b<= 3; ++b) {
        const _b = bFn(b)
        for (let c = 1; c <= 3; ++c) {
          data.addCases([{ __id__: `${a}-${_b}-${c}`, aId: `${a}`, bId: `${_b}`, cId: `${c}` }])
        }
      }
    }
  }

  beforeEach(() => {
    mockNodeIdCount = 0

    data = DataSet.create()
    data.addAttribute({ id: "aId", name: "a" })
    data.addAttribute({ id: "bId", name: "b" })
    data.addAttribute({ id: "cId", name: "c" })
    addDefaultCases()
  })

  it("isCaseTableModel tests for CaseTableModels", () => {
    expect(isCaseTableModel()).toBe(false)
    expect(isCaseTableModel(TileContentModel.create({ type: "foo" }))).toBe(false)
    expect(isCaseTableModel(CaseTableModel.create())).toBe(true)
  })

  it("stores column widths and hidden attributes", () => {
    const tableModel = CaseTableModel.create()
    expect(tableModel.columnWidth("foo")).toBeUndefined()
    expect(tableModel.isHidden("foo")).toBe(false)
    tableModel.setColumnWidth("foo", 10)
    tableModel.setIsHidden("foo", true)
    expect(tableModel.columnWidth("foo")).toBe(10)
    expect(tableModel.isHidden("foo")).toBe(true)
    tableModel.setColumnWidth("foo")
    tableModel.setIsHidden("foo", false)
    expect(tableModel.columnWidth("foo")).toBeUndefined()
    expect(tableModel.isHidden("foo")).toBe(false)
    // falsy values are removed from map
    expect(tableModel.columnWidths.size).toBe(0)
    expect(tableModel.hidden.size).toBe(0)
    // can show all hidden attributes
    tableModel.setIsHidden("foo", true)
    expect(tableModel.isHidden("foo")).toBe(true)
    tableModel.showAllAttributes()
    expect(tableModel.isHidden("foo")).toBe(false)
    expect(tableModel.hidden.size).toBe(0)
  })

  it("stores collapsed pseudo-cases", () => {
    const tableModel = CaseTableModel.create()

    // ignores collapse calls before DataSet is associated
    expect(tableModel.isCollapsed("foo")).toBe(false)
    tableModel.setIsCollapsed("foo", true)
    expect(tableModel.isCollapsed("foo")).toBe(false)

    tableModel.setData(data)
    // move attr "a" to a new collection (["aId"], ["bId", "cId"])
    data.moveAttributeToNewCollection("aId")
    const collection = data.collections[0]
    const cases = data.getCasesForAttributes(["aId"])
    const case0 = cases[0]
    expect(tableModel.isCollapsed(case0.__id__)).toBe(false)
    tableModel.setIsCollapsed(case0.__id__, true)
    expect(tableModel.isCollapsed(case0.__id__)).toBe(true)
    tableModel.setIsCollapsed(case0.__id__, false)
    expect(tableModel.isCollapsed(case0.__id__)).toBe(false)
    expect(tableModel.collections.size).toBe(1)
    expect(tableModel.collections.get(collection.id)?.collapsed.size).toBe(0)
  })
})
