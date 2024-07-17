import { reaction } from "mobx"
import {Instance, types} from "mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import {SharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {GraphDataConfigurationModel, isGraphDataConfigurationModel} from "./graph-data-configuration-model"

const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: SharedCaseMetadata,
  config: GraphDataConfigurationModel
})

let tree: Instance<typeof TreeModel>

describe("DataConfigurationModel", () => {
  beforeEach(() => {
    tree = TreeModel.create({
      data: {},
      metadata: {},
      config: {}
    })
    tree.data.addAttribute({ id: "nId", name: "n" })
    tree.data.addAttribute({ id: "xId", name: "x" })
    tree.data.addAttribute({ id: "yId", name: "y" })
    tree.metadata.setData(tree.data)
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c1", n: "n1", x: 1, y: 1 },
      { __id__: "c2", x: 2 },
      { __id__: "c3", n: "n3", y: 3 }
    ]))
  })

  it("behaves as expected when empty", () => {
    const config = tree.config
    expect(config.attributeID('caption')).toBe('')
    expect(config.attributeID("x")).toBe('')
    expect(config.attributeID("y")).toBe('')
    expect(config.attributeID("caption")).toEqual('')
    expect(config.attributeType("x")).toBeUndefined()
    expect(config.attributeType("caption")).toBeUndefined()
    expect(config.places).toEqual([])
    expect(config.attributes).toEqual([])
    expect(config.uniqueAttributes).toEqual([])
    expect(config.tipAttributes).toEqual([])
    expect(config.uniqueTipAttributes).toEqual([])
    expect(config.caseDataArray).toEqual([])
    expect(isGraphDataConfigurationModel(config)).toBe(true)
  })

  it("behaves as expected with empty/case plot", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    expect(config.attributeID('caption')).toBe("nId")
    expect(config.attributeID("x")).toBe("")
    expect(config.attributeID("y")).toBe("")
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBeUndefined()
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["caption"])
    expect(config.attributes).toEqual(["nId"])
    expect(config.uniqueAttributes).toEqual(["nId"])
    expect(config.tipAttributes).toEqual([{attributeID: "nId", role: "caption"}])
    expect(config.uniqueTipAttributes).toEqual([{attributeID: "nId", role: "caption"}])
    expect(config.caseDataArray).toEqual([
      {plotNum: 0, caseID: "c1"},
      {plotNum: 0, caseID: "c2"},
      {plotNum: 0, caseID: "c3"}
    ])
  })

  it("behaves as expected with dot chart on x axis", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    config.setAttribute("x", { attributeID: "nId" })
    expect(config.attributeID('caption')).toBe("nId")
    expect(config.attributeID("x")).toBe("nId")
    expect(config.attributeID("y")).toBe("")
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBe("categorical")
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.rolesForAttribute("nId")).toEqual(["x"])
    expect(config.categoricalAttrCount).toBe(1)
    expect(config.places).toEqual(["x", "caption"])
    expect(config.attributes).toEqual(["nId", "nId"])
    expect(config.uniqueAttributes).toEqual(["nId"])
    expect(config.tipAttributes).toEqual([{attributeID: "nId", role: "x"},
      {attributeID: "nId", role: "caption"}])
    expect(config.uniqueTipAttributes).toEqual([{attributeID: "nId", role: "caption"}])
    expect(config.caseDataArray).toEqual([
      {plotNum: 0, caseID: "c1"},
      {plotNum: 0, caseID: "c3"}
    ])
  })

  it("behaves as expected with dot plot on x axis", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    config.setAttribute("x", { attributeID: "xId" })
    expect(config.attributeID('caption')).toBe("nId")
    expect(config.attributeID("x")).toBe("xId")
    expect(config.attributeID("y")).toBe("")
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBe("numeric")
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.rolesForAttribute("xId")).toEqual(["x"])
    expect(config.places).toEqual(["x", "caption"])
    expect(config.attributes).toEqual(["xId", "nId"])
    expect(config.uniqueAttributes).toEqual(["xId", "nId"])
    expect(config.tipAttributes).toEqual([{attributeID: "xId", role: "x"},
      {attributeID: "nId", role: "caption"}])
    expect(config.uniqueTipAttributes).toEqual([{attributeID: "xId", role: "x"},
      {attributeID: "nId", role: "caption"}])
    expect(config.caseDataArray).toEqual([
      {plotNum: 0, caseID: "c1"},
      {plotNum: 0, caseID: "c2"}
    ])
  })

  it("behaves as expected with scatter plot and explicit caption attribute", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    config.setAttribute("x", { attributeID: "xId" })
    config.setAttribute("y", { attributeID: "yId" })
    config.setAttribute("caption", { attributeID: "nId" })
    expect(config.attributeID('caption')).toBe("nId")
    expect(config.attributeID("x")).toBe("xId")
    expect(config.attributeID("y")).toBe("yId")
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBe("numeric")
    expect(config.attributeType("y")).toBe("numeric")
    expect(config.rolesForAttribute("xId")).toEqual(["x"])
    expect(config.rolesForAttribute("yId")).toEqual(["y"])
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["x", "caption", "y"])
    expect(config.attributes).toEqual(["xId", "nId", "yId"])
    expect(config.uniqueAttributes).toEqual(["xId", "nId", "yId"])
    expect(config.tipAttributes).toEqual([{attributeID: "xId", role: "x"},
      {attributeID: "yId", role: "y"}, {attributeID: "nId", role: "caption"}])
    expect(config.uniqueTipAttributes).toEqual([{attributeID: "xId", role: "x"},
      {attributeID: "yId", role: "y"}, {attributeID: "nId", role: "caption"}])
    expect(config.caseDataArray).toEqual([{plotNum: 0, caseID: "c1"}])

    // behaves as expected after adding "x" as an additional y attribute
    config.addYAttribute({ attributeID: "xId" })
    expect(config.attributeID("y")).toBe("yId")
    expect(config.yAttributeIDs).toEqual(["yId", "xId"])
    config.removeAttributeFromRole("yPlus", "xId")
    expect(config.yAttributeIDs).toEqual(["yId"])

    // behaves as expected after adding "x" as right y attribute
    config.setY2Attribute({ attributeID: "xId" })
    expect(config.attributeID("y")).toBe("yId")
    expect(config.yAttributeIDs).toEqual(["yId", "xId"])
    config.removeAttributeFromRole("rightNumeric", "xId")
    expect(config.yAttributeIDs).toEqual(["yId"])

    // behaves as expected after removing x-axis attribute
    config.removeAttributeFromRole("x", "xId")
    expect(config.attributeID('caption')).toBe("nId")
    expect(config.attributeID("x")).toBe("")
    expect(config.attributeID("y")).toBe("yId")
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBeUndefined()
    expect(config.attributeType("y")).toBe("numeric")
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["caption", "y"])
    expect(config.attributes).toEqual(["nId", "yId"])
    expect(config.uniqueAttributes).toEqual(["nId", "yId"])
    expect(config.tipAttributes).toEqual([{attributeID: "yId", role: "y"},
      {attributeID: "nId", role: "caption"}])
    expect(config.uniqueTipAttributes).toEqual([{attributeID: "yId", role: "y"},
      {attributeID: "nId", role: "caption"}])
    expect(config.caseDataArray).toEqual([
      {plotNum: 0, caseID: "c1"},
      {plotNum: 0, caseID: "c3"}
    ])

    // updates cases when values change
    tree.data.setCaseValues([{ __id__: "c2", "yId": 2 }])
    expect(config.caseDataArray).toEqual([
      {plotNum: 0, caseID: "c1"},
      {plotNum: 0, caseID: "c2"},
      {plotNum: 0, caseID: "c3"}
    ])

    // triggers observers when values change
    const trigger = jest.fn()
    reaction(
      () => config.caseDataArray,
      () => trigger(),
      { name: "GraphDataConfigurationTest.caseDataArray reaction" })
    expect(trigger).not.toHaveBeenCalled()
    tree.data.setCaseValues([{ __id__: "c2", "yId": "" }])
    expect(trigger).toHaveBeenCalled()
    expect(config.caseDataArray).toEqual([
      {plotNum: 0, caseID: "c1"},
      {plotNum: 0, caseID: "c3"}
    ])
    trigger.mockClear()
    tree.data.setCaseValues([{ __id__: "c2", "yId": "2" }])
    expect(trigger).toHaveBeenCalled()
    expect(config.caseDataArray).toEqual([
      {plotNum: 0, caseID: "c1"},
      {plotNum: 0, caseID: "c2"},
      {plotNum: 0, caseID: "c3"}
    ])
  })

  it("selection behaves as expected", () => {
    const config = tree.config
    config.setAttribute("x", { attributeID: "xId" })
    expect(config.selection.length).toBe(0)

    config.setDataset(tree.data, tree.metadata)
    tree.data.selectAll()
    expect(config.selection.length).toBe(2)

    config.setAttribute("x", { attributeID: "xId" })
    expect(config.selection.length).toBe(2)

    const selectionReaction = jest.fn()
    const disposer = reaction(
      () => config.selection,
      () => selectionReaction(),
      { name: "GraphDataConfigurationTest selectionReaction" })
    expect(selectionReaction).toHaveBeenCalledTimes(0)
    config.setAttribute("y", { attributeID: "yId" })
    expect(config.selection.length).toBe(1)
    expect(selectionReaction).toHaveBeenCalledTimes(1)
    disposer()
  })

  it("calls action listeners when appropriate", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    config.setAttribute("x", { attributeID: "xId" })

    const handleAction = jest.fn()
    config.onAction(handleAction)

    tree.data.setCaseValues([{ __id__: "c1", xId: 1.1 }])
    expect(handleAction).toHaveBeenCalled()
    expect(handleAction.mock.lastCall[0].name).toBe("setCaseValues")
    handleAction.mockClear()

    tree.data.setCaseValues([{ __id__: "c3", xId: 3 }])
    expect(handleAction).toHaveBeenCalled()
    expect(handleAction.mock.lastCall[0].name).toBe("addCases")
    handleAction.mockClear()

    tree.data.setCaseValues([{ __id__: "c1", xId: "" }])
    expect(handleAction).toHaveBeenCalled()
    expect(handleAction.mock.lastCall[0].name).toBe("removeCases")
    handleAction.mockClear()

    tree.data.setCaseValues([{ __id__: "c1", xId: 1 }, { __id__: "c2", xId: "" }, { __id__: "c3", xId: 3.3 }])
    expect(handleAction).toHaveBeenCalled()
  })

  it("only allows x and y as primary place", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    config.setPrimaryRole('y')
    expect(config.primaryRole).toBe("y")
    config.setPrimaryRole('caption')
    expect(config.primaryRole).toBe("y")
  })

  it("returns an attribute values array and category set that ignore empty values", () => {
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c4", n: "n1", x: 1, y: 1 },
      { __id__: "c5", n: "", x: 6, y: 1 },
      { __id__: "c6", n: "n1", x: 6, y: 6 }]))
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    config.setAttribute("x", { attributeID: "xId" })
    config.setAttribute("y", { attributeID: "yId" })
    config.setAttribute("caption", { attributeID: "nId" })
    expect(config.valuesForAttrRole("x")).toEqual(["1", "1", "6", "6"])
    expect(config.valuesForAttrRole("y")).toEqual(["1", "1", "1", "6"])
    expect(config.valuesForAttrRole("caption")).toEqual(["n1", "n1", "n1"])
    expect(config.categoryArrayForAttrRole("x")).toEqual(["1", "6"])
    expect(config.categoryArrayForAttrRole("y")).toEqual(["1", "6"])
    expect(config.categoryArrayForAttrRole("caption")).toEqual(["n1"])
    expect(config.numericValuesForAttrRole("x")).toEqual([1, 1, 6, 6])
    expect(config.numericValuesForAttrRole("caption")).toEqual([])

    config.setAttribute("y")
    expect(config.valuesForAttrRole("y")).toEqual([])
    expect(config.categoryArrayForAttrRole("y")).toEqual(["__main__"])
  })

  it("returns an array of cases in a plot", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    expect(config.allPlottedCases()).toEqual(["c1", "c2", "c3"])
    expect(config.subPlotCases({})).toEqual(["c1", "c2", "c3"])
    expect(config.cellCases({})).toEqual(["c1", "c2", "c3"])
    expect(config.rowCases({})).toEqual(["c1", "c2", "c3"])
    expect(config.columnCases({})).toEqual(["c1", "c2", "c3"])

    config.setAttribute("x", { attributeID: "xId" })
    expect(config.allPlottedCases()).toEqual(["c1", "c2"])
    expect(config.subPlotCases({})).toEqual(["c1", "c2"])
    expect(config.cellCases({})).toEqual(["c1", "c2"])
    expect(config.rowCases({})).toEqual(["c1", "c2"])
    expect(config.columnCases({})).toEqual(["c1", "c2"])

    config.setAttribute("y", { attributeID: "yId" })
    expect(config.allPlottedCases()).toEqual(["c1"])
    expect(config.subPlotCases({})).toEqual(["c1"])
    expect(config.cellCases({})).toEqual(["c1"])
    expect(config.rowCases({})).toEqual(["c1"])
    expect(config.columnCases({})).toEqual(["c1"])

    config.setAttribute("topSplit", { attributeID: "nId" })
    expect(config.allPlottedCases()).toEqual(["c1"])
    expect(config.subPlotCases({})).toEqual(["c1"])
    expect(config.cellCases({ nId: "n1" })).toEqual(["c1"])
    expect(config.rowCases({})).toEqual([])
    expect(config.rowCases({ nId: "n1" })).toEqual(["c1"])
    expect(config.columnCases({})).toEqual([])
    expect(config.columnCases({ nId: "n1" })).toEqual(["c1"])

    config.setAttribute("x")
    expect(config.allPlottedCases()).toEqual(["c1", "c3"])
    expect(config.subPlotCases({})).toEqual(["c1", "c3"])
    expect(config.cellCases({ nId: "n1" })).toEqual(["c1"])
    expect(config.cellCases({ nId: "n3" })).toEqual(["c3"])
    expect(config.rowCases({})).toEqual([])
    expect(config.rowCases({ nId: "n1" })).toEqual(["c1"])
    expect(config.rowCases({ nId: "n3" })).toEqual(["c3"])
    expect(config.columnCases({})).toEqual([])
    expect(config.columnCases({ nId: "n1" })).toEqual(["c1"])
    expect(config.columnCases({ nId: "n3" })).toEqual(["c3"])
  })

  it("can create cell key", () => {
    const config = tree.config
    const mockData: Record<string, Record<string, any>> = {
      id: {
        x: "abc123",
        y: "def456",
        topSplit: "ghi789",
        rightSplit: "jkl012"
      },
      type: {
        x: "categorical",
        y: "categorical",
      },
      categoryArrayForAttrRole: {
        x: ["pizza", "pasta", "salad"],
        y: ["red", "green", "blue"],
        topSplit: ["small", "medium", "large"],
        rightSplit: ["new", "used"]
      }
    }
    config.attributeID = (role: string) => mockData.id[role]
    config.attributeType = (role: string) => mockData.type[role]
    ;(config as any).categoryArrayForAttrRole = (role: string) => mockData.categoryArrayForAttrRole[role]

    const cellKey = config.cellKey(0)
    expect(cellKey).toEqual({abc123: "pizza", def456: "red", ghi789: "small", jkl012: "new"})
  })

  it("generates a list of all cell keys for a graph", () => {
    const config = tree.config
    let mockData: Record<string, Record<string, any>>
    config.attributeID = (role: string) => mockData.id[role]
    config.attributeType = (role: string) => mockData.type[role]
    ;(config as any).categoryArrayForAttrRole = (role: string) => mockData.categoryArrayForAttrRole[role]

    // For a graph with no categorical attributes
    mockData = {
      id: {
        x: "abc123",
        y: "def456",
        topSplit: "ghi789",
        rightSplit: "jkl012"
      },
      type: {
        x: "categorical",
        y: "categorical",
      },
      categoryArrayForAttrRole: {
        x: [],
        y: [],
        topSplit: [],
        rightSplit: []
      }
    }
    const noCategoricalCellKeys = config.getAllCellKeys()
    expect(noCategoricalCellKeys.length).toEqual(1)
    expect(noCategoricalCellKeys[0]).toEqual({})

    // For a graph with one categorical attribute
    mockData = {
      id: {
        x: "abc123",
        y: "def456",
        topSplit: "ghi789",
        rightSplit: "jkl012"
      },
      type: {
        x: "categorical",
        y: "categorical",
      },
      categoryArrayForAttrRole: {
        x: [],
        y: ["small", "large"],
        topSplit: [],
        rightSplit: []
      }
    }

    const oneCategoricalCellKeys = config.getAllCellKeys()
    expect(oneCategoricalCellKeys.length).toEqual(2)
    expect(oneCategoricalCellKeys[0]).toEqual({"def456": "small"})
    expect(oneCategoricalCellKeys[1]).toEqual({"def456": "large"})

    // For a graph with multiple categorical attributes
    mockData = {
      id: {
        x: "abc123",
        y: "def456",
        topSplit: "ghi789",
        rightSplit: "jkl012"
      },
      type: {
        x: "categorical",
        y: "categorical",
      },
      categoryArrayForAttrRole: {
        x: ["pizza", "salad"],
        y: ["red", "green"],
        topSplit: ["medium", "large"],
        rightSplit: ["hot", "cold"]
      }
    }
    const cellKeys = config.getAllCellKeys()
    expect(cellKeys.length).toEqual(16)
    expect(cellKeys[0]).toEqual({abc123: "pizza", def456: "red", ghi789: "medium", jkl012: "hot"})
    expect(cellKeys[15]).toEqual({abc123: "salad", def456: "green", ghi789: "large", jkl012: "cold"})
  })
})
