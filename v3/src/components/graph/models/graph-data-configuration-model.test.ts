import { reaction } from "mobx"
import {applyPatch, Instance, types} from "mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import {DataSetMetadata} from "../../../models/shared/data-set-metadata"
import { missingColor } from "../../../utilities/color-utils"
import { kMain } from "../../data-display/data-display-types"
import {GraphDataConfigurationModel, isGraphDataConfigurationModel} from "./graph-data-configuration-model"

const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
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

  const caseIdFromItemId = (itemId: string) => tree.data.getItemChildCaseId(itemId)
  const caseIdsFromItemIds = (itemIds: string[]) => itemIds.map(caseIdFromItemId)

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
    expect(config.getCaseDataArray(0)).toEqual([])
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
    expect(config.getCaseDataArray(0)).toEqual([
      {plotNum: 0, caseID: caseIdFromItemId("c1")},
      {plotNum: 0, caseID: caseIdFromItemId("c2")},
      {plotNum: 0, caseID: caseIdFromItemId("c3")}
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
    expect(config.getCaseDataArray(0)).toEqual([
      {plotNum: 0, caseID: caseIdFromItemId("c1")},
      {plotNum: 0, caseID: caseIdFromItemId("c3")}
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
    expect(config.getCaseDataArray(0)).toEqual([
      {plotNum: 0, caseID: caseIdFromItemId("c1")},
      {plotNum: 0, caseID: caseIdFromItemId("c2")}
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
    expect(config.getCaseDataArray(0)).toEqual([{plotNum: 0, caseID: caseIdFromItemId("c1")}])

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
    expect(config.getCaseDataArray(0)).toEqual([
      {plotNum: 0, caseID: caseIdFromItemId("c1")},
      {plotNum: 0, caseID: caseIdFromItemId("c3")}
    ])

    // updates cases when values change
    tree.data.setCaseValues([{ __id__: "c2", "yId": 2 }])
    expect(config.getCaseDataArray(0)).toEqual([
      {plotNum: 0, caseID: caseIdFromItemId("c1")},
      {plotNum: 0, caseID: caseIdFromItemId("c2")},
      {plotNum: 0, caseID: caseIdFromItemId("c3")}
    ])

    // triggers observers when values change
    const trigger = jest.fn()
    reaction(
      () => config.casesChangeCount,
      () => trigger(),
      { name: "GraphDataConfigurationTest.casesChangeCount reaction" })
    expect(trigger).not.toHaveBeenCalled()
    tree.data.setCaseValues([{ __id__: "c2", "yId": "" }])
    expect(trigger).toHaveBeenCalled()
    expect(config.getCaseDataArray(0)).toEqual([
      {plotNum: 0, caseID: caseIdFromItemId("c1")},
      {plotNum: 0, caseID: caseIdFromItemId("c3")}
    ])
    trigger.mockClear()
    tree.data.setCaseValues([{ __id__: "c2", "yId": "2" }])
    expect(trigger).toHaveBeenCalled()
    expect(config.getCaseDataArray(0)).toEqual([
      {plotNum: 0, caseID: caseIdFromItemId("c1")},
      {plotNum: 0, caseID: caseIdFromItemId("c2")},
      {plotNum: 0, caseID: caseIdFromItemId("c3")}
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

    tree.data.setCaseValues([{ __id__: caseIdFromItemId("c1")!, xId: 1.1 }])
    expect(handleAction).toHaveBeenCalled()
    expect(handleAction.mock.lastCall[0].name).toBe("setCaseValues")
    handleAction.mockClear()

    tree.data.setCaseValues([{ __id__: caseIdFromItemId("c3")!, xId: 3 }])
    expect(handleAction).toHaveBeenCalled()
    expect(handleAction.mock.lastCall[0].name).toBe("addCases")
    handleAction.mockClear()

    tree.data.setCaseValues([{ __id__: caseIdFromItemId("c1")!, xId: "" }])
    expect(handleAction).toHaveBeenCalled()
    expect(handleAction.mock.lastCall[0].name).toBe("removeCases")
    handleAction.mockClear()

    tree.data.setCaseValues([
      { __id__: caseIdFromItemId("c1")!, xId: 1 },
      { __id__: caseIdFromItemId("c2")!, xId: "" },
      { __id__: caseIdFromItemId("c3")!, xId: 3.3 }
    ])
    expect(handleAction).toHaveBeenCalled()
  })

  it("only allows x and y as primary place", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    config.setPrimaryRole('y')
    expect(config.primaryRole).toBe("y")
    config.setPrimaryRole('caption')
    expect(config.primaryRole).toBeUndefined()
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
    expect(config.categoryArrayForAttrRole("y")).toEqual([kMain])
  })

  it("returns an array of cases in a plot", () => {
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)
    expect(config.allPlottedCases()).toEqual(caseIdsFromItemIds(["c1", "c2", "c3"]))
    expect(config.subPlotCases({})).toEqual(caseIdsFromItemIds(["c1", "c2", "c3"]))
    expect(config.cellCases({})).toEqual(caseIdsFromItemIds(["c1", "c2", "c3"]))
    expect(config.rowCases({})).toEqual(caseIdsFromItemIds(["c1", "c2", "c3"]))
    expect(config.columnCases({})).toEqual(caseIdsFromItemIds(["c1", "c2", "c3"]))

    config.setAttribute("x", { attributeID: "xId" })
    expect(config.allPlottedCases()).toEqual(caseIdsFromItemIds(["c1", "c2"]))
    expect(config.subPlotCases({})).toEqual(caseIdsFromItemIds(["c1", "c2"]))
    expect(config.cellCases({})).toEqual(caseIdsFromItemIds(["c1", "c2"]))
    expect(config.rowCases({})).toEqual(caseIdsFromItemIds(["c1", "c2"]))
    expect(config.columnCases({})).toEqual(caseIdsFromItemIds(["c1", "c2"]))

    config.setAttribute("y", { attributeID: "yId" })
    expect(config.allPlottedCases()).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.subPlotCases({})).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.cellCases({})).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.rowCases({})).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.columnCases({})).toEqual(caseIdsFromItemIds(["c1"]))

    config.setAttribute("topSplit", { attributeID: "nId" })
    expect(config.allPlottedCases()).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.subPlotCases({})).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.cellCases({ nId: "n1" })).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.rowCases({})).toEqual([])
    expect(config.rowCases({ nId: "n1" })).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.columnCases({})).toEqual([])
    expect(config.columnCases({ nId: "n1" })).toEqual(caseIdsFromItemIds(["c1"]))

    config.setAttribute("x")
    expect(config.allPlottedCases()).toEqual(caseIdsFromItemIds(["c1", "c3"]))
    expect(config.subPlotCases({})).toEqual(caseIdsFromItemIds(["c1", "c3"]))
    expect(config.cellCases({ nId: "n1" })).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.cellCases({ nId: "n3" })).toEqual(caseIdsFromItemIds(["c3"]))
    expect(config.rowCases({})).toEqual([])
    expect(config.rowCases({ nId: "n1" })).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.rowCases({ nId: "n3" })).toEqual(caseIdsFromItemIds(["c3"]))
    expect(config.columnCases({})).toEqual([])
    expect(config.columnCases({ nId: "n1" })).toEqual(caseIdsFromItemIds(["c1"]))
    expect(config.columnCases({ nId: "n3" })).toEqual(caseIdsFromItemIds(["c3"]))
  })

  it("invalidates filteredCases when _attributeDescriptions mutate without setAttribute (CODAP-1297)", () => {
    // Regression: MST undo replays patches that mutate _attributeDescriptions directly,
    // bypassing setAttribute()'s call to invalidateCases(). A reaction on
    // attributeDescriptionsStr must catch this so cached caseIds are recomputed.
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)

    config.setAttribute("x", { attributeID: "xId", type: "numeric" })
    expect(config.filteredCases[0].caseIds).toEqual(caseIdsFromItemIds(["c1", "c2"]))

    config.setAttribute("x", { attributeID: "yId", type: "numeric" })
    expect(config.filteredCases[0].caseIds).toEqual(caseIdsFromItemIds(["c1", "c3"]))

    // Simulate undo: replace _attributeDescriptions/x in place via MST patch.
    applyPatch(config, {
      op: "replace",
      path: "/_attributeDescriptions/x",
      value: { attributeID: "xId", type: "numeric" }
    })
    expect(config.filteredCases[0].caseIds).toEqual(caseIdsFromItemIds(["c1", "c2"]))
  })

  it("invalidates filteredCases for y[1+] when patch replay replaces it in place (CODAP-1297)", () => {
    // Regression: when MST undo replays a JSON patch that replaces _yAttributeDescriptions[i]
    // in place, FilteredCases at that index isn't destroyed/recreated and its cache must be
    // invalidated. The parent class reaction on attributeDescriptionsStr only covers y[0];
    // y[1+] needs invalidation via the graph subclass's allYAttributeDescriptions reaction.
    const config = tree.config
    config.setDataset(tree.data, tree.metadata)

    config.setAttribute("x", { attributeID: "xId", type: "numeric" })
    config.setAttribute("y", { attributeID: "yId", type: "numeric" })
    config.addYAttribute({ attributeID: "xId", type: "numeric" })
    // y[1] = xId: requires xId valid (c1, c2) and x = xId valid (c1, c2) → c1, c2
    expect(config.filteredCases[1].caseIds).toEqual(caseIdsFromItemIds(["c1", "c2"]))

    // Simulate undo: replace _yAttributeDescriptions[1] in place via MST patch.
    applyPatch(config, {
      op: "replace",
      path: "/_yAttributeDescriptions/1",
      value: { attributeID: "yId", type: "numeric" }
    })
    // y[1] = yId: requires yId valid (c1, c3) and x = xId valid (c1, c2) → c1
    expect(config.filteredCases[1].caseIds).toEqual(caseIdsFromItemIds(["c1"]))
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

    let index = 0
    for (const top of mockData.categoryArrayForAttrRole.topSplit) {
      for (const right of mockData.categoryArrayForAttrRole.rightSplit) {
        for (const y of mockData.categoryArrayForAttrRole.y) {
          for (const x of mockData.categoryArrayForAttrRole.x) {
            expect(config.cellKey(index)).toEqual({abc123: x, def456: y, ghi789: top, jkl012: right})
            ++index
          }
        }
      }
    }
  })
})

describe("DataConfigurationModel legend range overrides", () => {
  beforeEach(() => {
    tree = TreeModel.create({ data: {}, metadata: {}, config: {} })
    tree.data.addAttribute({ id: "legId", name: "leg" })
    tree.metadata.setData(tree.data)
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c1", leg: 0 },
      { __id__: "c2", leg: 10 },
      { __id__: "c3", leg: 20 },
      { __id__: "c4", leg: 40 }
    ]))
    tree.config.setDataset(tree.data, tree.metadata)
    tree.config.setAttribute("legend", { attributeID: "legId" })
    tree.metadata.setAttributeBinningType("legId", "quantize")
  })

  it("uses the data extent for the quantize domain when no override is set", () => {
    expect(tree.config.attributeType("legend")).toBe("numeric")
    expect(tree.config.legendNumericColorScale.domain()).toEqual([0, 40])
  })

  it("applies a min-only override to the quantize domain", () => {
    tree.metadata.setAttributeLegendMin("legId", 10)
    expect(tree.config.legendNumericColorScale.domain()).toEqual([10, 40])
  })

  it("applies a max-only override to the quantize domain", () => {
    tree.metadata.setAttributeLegendMax("legId", 20)
    expect(tree.config.legendNumericColorScale.domain()).toEqual([0, 20])
  })

  it("applies both override bounds to the quantize domain", () => {
    tree.metadata.setAttributeLegendMin("legId", 10)
    tree.metadata.setAttributeLegendMax("legId", 20)
    expect(tree.config.legendNumericColorScale.domain()).toEqual([10, 20])
  })

  it("colors out-of-range values as missing in quantize mode", () => {
    tree.metadata.setAttributeLegendMin("legId", 10)
    tree.metadata.setAttributeLegendMax("legId", 20)
    // values outside the user-set range are treated as missing rather than clamped into an end bin
    expect(tree.config.getLegendColorForNumericValue(100)).toBe(missingColor)
    expect(tree.config.getLegendColorForNumericValue(-100)).toBe(missingColor)
    // the inclusive endpoints (and an interior value) still get real bin colors
    expect(tree.config.getLegendColorForNumericValue(10)).not.toBe(missingColor)
    expect(tree.config.getLegendColorForNumericValue(15)).not.toBe(missingColor)
    expect(tree.config.getLegendColorForNumericValue(20)).not.toBe(missingColor)
  })

  it("colors out-of-range values as missing in quantile mode", () => {
    tree.metadata.setAttributeBinningType("legId", "quantile")
    tree.metadata.setAttributeLegendMin("legId", 10)
    tree.metadata.setAttributeLegendMax("legId", 20)
    // the override excludes 0 and 40, which become missing rather than clamping to an end bin
    expect(tree.config.getLegendColorForNumericValue(0)).toBe(missingColor)
    expect(tree.config.getLegendColorForNumericValue(40)).toBe(missingColor)
    expect(tree.config.getLegendColorForNumericValue(10)).not.toBe(missingColor)
    expect(tree.config.getLegendColorForNumericValue(20)).not.toBe(missingColor)
  })

  it("excludes out-of-range cases from the end bins, keeping the inclusive endpoints", () => {
    // case ids are auto-generated, so assert on the binned values rather than literal ids
    tree.metadata.setAttributeLegendMin("legId", 10)
    tree.metadata.setAttributeLegendMax("legId", 20)
    const binCount = tree.config.legendNumericColorScale.range().length
    const binnedValues = new Set<number>()
    for (let bin = 0; bin < binCount; bin++) {
      tree.config.getCasesForLegendBin(bin).forEach((id: string) => {
        binnedValues.add(tree.data.getNumeric(id, "legId")!)
      })
    }
    // 0 and 40 are outside [10, 20] and must not be selectable via any bin; the inclusive
    // endpoints 10 and 20 land in the first and last bins respectively.
    expect([...binnedValues].sort((a, b) => a - b)).toEqual([10, 20])
  })

  it("filters trained values to the override range in quantile mode", () => {
    tree.metadata.setAttributeBinningType("legId", "quantile")
    // d3's scaleQuantile.domain() reports the sorted training samples; without an
    // override all four values train the scale
    expect(tree.config.legendNumericColorScale.domain()).toEqual([0, 10, 20, 40])
    // restricting the range drops the out-of-range value from the trained domain
    tree.metadata.setAttributeLegendMax("legId", 20)
    expect(tree.config.legendNumericColorScale.domain()).toEqual([0, 10, 20])
  })
  it("falls back to the data extent when overrides leave the quantize range reversed", () => {
    // an override min above the data, with max cleared, would leave a reversed [50, 40] range
    tree.metadata.setAttributeLegendMin("legId", 50)
    expect(tree.config.legendNumericColorScale.domain()).toEqual([0, 40])
  })
  it("trains on all values when the override range excludes everything in quantile mode", () => {
    tree.metadata.setAttributeBinningType("legId", "quantile")
    // an override min above every value would yield an empty trained set; fall back to all values
    tree.metadata.setAttributeLegendMin("legId", 100)
    expect(tree.config.legendNumericColorScale.domain()).toEqual([0, 10, 20, 40])
  })

  it("reports the effective legend display range (override, else data extent)", () => {
    // no override -> the data extent
    expect(tree.config.legendNumericRange).toEqual({ min: 0, max: 40 })
    tree.metadata.setAttributeLegendMin("legId", 10)
    tree.metadata.setAttributeLegendMax("legId", 20)
    expect(tree.config.legendNumericRange).toEqual({ min: 10, max: 20 })
  })

  it("reports the display range independent of binning type (quantile too)", () => {
    // In quantile mode the trained domain is the data quantiles, but the display range should still
    // reflect the user-set override so the legend endpoints match the Min/Max inputs (CODAP-1292).
    tree.metadata.setAttributeBinningType("legId", "quantile")
    tree.metadata.setAttributeLegendMin("legId", 5)
    tree.metadata.setAttributeLegendMax("legId", 35)
    expect(tree.config.legendNumericRange).toEqual({ min: 5, max: 35 })
  })

  it("falls back to the data extent when the override range is reversed", () => {
    tree.metadata.setAttributeLegendMin("legId", 50) // above the data, with max cleared
    expect(tree.config.legendNumericRange).toEqual({ min: 0, max: 40 })
  })

  it("defaults to the smaller of 5 and the distinct-value count", () => {
    // only 4 distinct legend values, so the default of 5 clamps to 4
    expect(tree.config.legendNumericColorScale.range().length).toBe(4)
  })

  it("uses 5 bins by default once there are at least 5 distinct values", () => {
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c5", leg: 60 }, { __id__: "c6", leg: 80 }
    ]))
    expect(tree.config.legendNumericColorScale.range().length).toBe(5)
  })

  it("uses the per-attribute bin count for the number of legend bins", () => {
    tree.metadata.setAttributeBinCount("legId", 3)
    expect(tree.config.legendNumericColorScale.range().length).toBe(3)
  })

  it("clamps the bin count to the number of distinct values", () => {
    // 4 distinct values -> cannot exceed 4 bins even if more are requested
    tree.metadata.setAttributeBinCount("legId", 10)
    expect(tree.config.legendNumericColorScale.range().length).toBe(4)
  })

  it("floors the bin count at 2", () => {
    tree.metadata.setAttributeBinCount("legId", 1)
    expect(tree.config.legendNumericColorScale.range().length).toBe(2)
  })

  it("coerces a fractional stored bin count to an integer", () => {
    // A fractional value can only reach the model by bypassing the (normalizing) setter -- e.g.
    // restoring a hand-edited/legacy snapshot. Patch one in directly to exercise the getter.
    tree.metadata.setAttributeBinCount("legId", 3)
    applyPatch(tree.metadata, { op: "replace", path: "/attributes/legId/scale/binCount", value: 2.6 })
    // the reported count is an integer, matching the rendered color-ramp length
    expect(tree.config.legendBinCount).toBe(3)
    expect(tree.config.legendNumericColorScale.range().length).toBe(3)
  })

  it("builds a scaleThreshold with equal-ratio cut points in logarithmic mode", () => {
    // legend values 0,10,20,40 from beforeEach; smallest positive is 10, max is 40
    tree.metadata.setAttributeBinningType("legId", "logarithmic")
    tree.metadata.setAttributeBinCount("legId", 2)
    // 2 bins -> 1 threshold at the geometric midpoint of [10, 40] = 20
    const thresholds = tree.config.legendNumericColorScale.domain()
    expect(thresholds).toHaveLength(1)
    expect(thresholds[0]).toBeCloseTo(20, 6)
  })

  it("floors the log domain to the smallest positive value (ignoring non-positive data)", () => {
    tree.metadata.setAttributeBinningType("legId", "logarithmic")
    // smallest positive value (10), not the data min (0), is the low endpoint
    expect(tree.config.legendDisplayRange).toEqual({ min: 10, max: 40 })
  })

  it("ignores a Min override <= 0 in logarithmic mode but honors a positive Min and the Max", () => {
    tree.metadata.setAttributeBinningType("legId", "logarithmic")
    tree.metadata.setAttributeLegendMin("legId", -5)   // invalid for log -> ignored
    expect(tree.config.legendDisplayRange.min).toBe(10) // falls back to smallest positive
    tree.metadata.setAttributeLegendMin("legId", 5)     // positive override honored
    tree.metadata.setAttributeLegendMax("legId", 30)
    expect(tree.config.legendDisplayRange).toEqual({ min: 5, max: 30 })
  })

  it("colors non-positive and out-of-range values as missing in logarithmic mode", () => {
    tree.metadata.setAttributeBinningType("legId", "logarithmic")
    // non-positive values are outside the positive log domain -> missing
    expect(tree.config.getLegendColorForNumericValue(-1)).toBe(missingColor)
    expect(tree.config.getLegendColorForNumericValue(0)).toBe(missingColor)
    // a positive value within the domain [10, 40] gets a real bin color
    expect(tree.config.getLegendColorForNumericValue(15)).not.toBe(missingColor)
    // positive values outside the domain are also missing (unified with quantize/quantile)
    tree.metadata.setAttributeLegendMin("legId", 15)
    tree.metadata.setAttributeLegendMax("legId", 30)
    expect(tree.config.getLegendColorForNumericValue(10)).toBe(missingColor)  // below min
    expect(tree.config.getLegendColorForNumericValue(40)).toBe(missingColor)  // above max
  })

  it("falls back to the positive data extent when a logarithmic override range is reversed", () => {
    tree.metadata.setAttributeBinningType("legId", "logarithmic")
    tree.metadata.setAttributeLegendMin("legId", 100)
    tree.metadata.setAttributeLegendMax("legId", 40) // reversed (min >= max)
    // rather than blanking the legend, fall back to the positive data extent [smallest positive, max]
    expect(tree.config.legendDisplayRange).toEqual({ min: 10, max: 40 })
  })

  it("degenerates to a single bin when the data has no positive values", () => {
    // build a dataset with only non-positive legend values (the honest degenerate condition)
    const t = TreeModel.create({ data: {}, metadata: {}, config: {} })
    t.data.addAttribute({ id: "legId", name: "leg" })
    t.metadata.setData(t.data)
    t.data.addCases(toCanonical(t.data, [
      { __id__: "n1", leg: 0 }, { __id__: "n2", leg: -3 }, { __id__: "n3", leg: -10 }
    ]))
    t.config.setDataset(t.data, t.metadata)
    t.config.setAttribute("legend", { attributeID: "legId" })
    t.metadata.setAttributeBinningType("legId", "logarithmic")
    expect(t.config.legendNumericColorScale.domain()).toHaveLength(0)
  })

  it("excludes non-positive cases from the first bin when logarithmic", () => {
    // a negative case (case ids are auto-generated, so assert on values rather than a literal id)
    tree.data.addCases(toCanonical(tree.data, [{ leg: -7 }]))
    tree.metadata.setAttributeBinningType("legId", "logarithmic")
    const firstThreshold = tree.config.legendNumericColorScale.domain()[0]
    const bin0Cases = tree.config.getCasesForLegendBin(0)
    // every case in the first bin must be a positive value below the first threshold; the
    // non-positive case (and the zero from beforeEach) must be excluded as "missing".
    expect(bin0Cases.length).toBeGreaterThan(0)
    bin0Cases.forEach(id => {
      const v = tree.data.getNumeric(id, "legId")!
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThan(firstThreshold)
    })
  })

  it("leaves non-degenerate quantile binning as a d3 quantile scale", () => {
    // six distinct values, 3 bins -> standard quantiles, no degeneracy, scale stays a ScaleQuantile
    const t = TreeModel.create({ data: {}, metadata: {}, config: {} })
    t.data.addAttribute({ id: "legId", name: "leg" })
    t.metadata.setData(t.data)
    t.data.addCases(toCanonical(t.data, [
      { leg: 1 }, { leg: 2 }, { leg: 3 }, { leg: 4 }, { leg: 5 }, { leg: 6 }
    ]))
    t.config.setDataset(t.data, t.metadata)
    t.config.setAttribute("legend", { attributeID: "legId" })
    t.metadata.setAttributeBinningType("legId", "quantile")
    t.metadata.setAttributeBinCount("legId", 3)
    // a ScaleQuantile exposes quantiles(); a repaired ScaleThreshold does not
    expect("quantiles" in t.config.legendNumericColorScale).toBe(true)
    expect(t.config.legendBinDataExtents).toBeUndefined()
  })

  it("repairs degenerate quantile binning so distinct values get distinct colors", () => {
    // eight 1s, one 2, one 3; 3 bins. d3 collapses all into the last bin/color.
    const t = TreeModel.create({ data: {}, metadata: {}, config: {} })
    t.data.addAttribute({ id: "legId", name: "leg" })
    t.metadata.setData(t.data)
    const cases = []
    for (let i = 0; i < 8; i++) cases.push({ leg: 1 })
    cases.push({ leg: 2 }); cases.push({ leg: 3 })
    t.data.addCases(toCanonical(t.data, cases))
    t.config.setDataset(t.data, t.metadata)
    t.config.setAttribute("legend", { attributeID: "legId" })
    t.metadata.setAttributeBinningType("legId", "quantile")
    t.metadata.setAttributeBinCount("legId", 3)
    const c1 = t.config.getLegendColorForNumericValue(1)
    const c2 = t.config.getLegendColorForNumericValue(2)
    const c3 = t.config.getLegendColorForNumericValue(3)
    // three distinct colors, none missing
    expect(new Set([c1, c2, c3]).size).toBe(3)
    expect(c1).not.toBe(missingColor)
    // bins partition the data by value, each non-empty
    const v0 = t.config.getCasesForLegendBin(0).map((id: string) => t.data.getNumeric(id, "legId"))
    const v1 = t.config.getCasesForLegendBin(1).map((id: string) => t.data.getNumeric(id, "legId"))
    const v2 = t.config.getCasesForLegendBin(2).map((id: string) => t.data.getNumeric(id, "legId"))
    expect(v0).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
    expect(v1).toEqual([2])
    expect(v2).toEqual([3])
  })

  it("exposes per-bin data extents for a degenerate quantile legend", () => {
    const t = TreeModel.create({ data: {}, metadata: {}, config: {} })
    t.data.addAttribute({ id: "legId", name: "leg" })
    t.metadata.setData(t.data)
    const cases = []
    for (let i = 0; i < 8; i++) cases.push({ leg: 1 })
    cases.push({ leg: 2 }); cases.push({ leg: 3 })
    t.data.addCases(toCanonical(t.data, cases))
    t.config.setDataset(t.data, t.metadata)
    t.config.setAttribute("legend", { attributeID: "legId" })
    t.metadata.setAttributeBinningType("legId", "quantile")
    t.metadata.setAttributeBinCount("legId", 3)
    expect(t.config.legendBinDataExtents).toEqual([
      { min: 1, max: 1 }, { min: 2, max: 2 }, { min: 3, max: 3 }
    ])
  })

  it("does not expose bin extents for quantize or logarithmic legends", () => {
    const t = TreeModel.create({ data: {}, metadata: {}, config: {} })
    t.data.addAttribute({ id: "legId", name: "leg" })
    t.metadata.setData(t.data)
    t.data.addCases(toCanonical(t.data, [{ leg: 1 }, { leg: 2 }, { leg: 3 }]))
    t.config.setDataset(t.data, t.metadata)
    t.config.setAttribute("legend", { attributeID: "legId" })
    t.metadata.setAttributeBinningType("legId", "quantize")
    expect(t.config.legendBinDataExtents).toBeUndefined()
    t.metadata.setAttributeBinningType("legId", "logarithmic")
    expect(t.config.legendBinDataExtents).toBeUndefined()
  })

  it("switches between standard and repaired quantile bins as the data changes", () => {
    // start non-degenerate: six distinct values
    const t = TreeModel.create({ data: {}, metadata: {}, config: {} })
    t.data.addAttribute({ id: "legId", name: "leg" })
    t.metadata.setData(t.data)
    t.data.addCases(toCanonical(t.data, [
      { __id__: "c1", leg: 1 }, { __id__: "c2", leg: 2 }, { __id__: "c3", leg: 3 },
      { __id__: "c4", leg: 4 }, { __id__: "c5", leg: 5 }, { __id__: "c6", leg: 6 }
    ]))
    t.config.setDataset(t.data, t.metadata)
    t.config.setAttribute("legend", { attributeID: "legId" })
    t.metadata.setAttributeBinningType("legId", "quantile")
    t.metadata.setAttributeBinCount("legId", 3)
    const caseId = (itemId: string) => t.data.getItemChildCaseId(itemId)!
    expect("quantiles" in t.config.legendNumericColorScale).toBe(true)   // d3 quantile scale
    expect(t.config.legendBinDataExtents).toBeUndefined()

    // make it degenerate: four 1s plus 2 and 3
    t.data.setCaseValues([
      { __id__: caseId("c4"), legId: 1 },
      { __id__: caseId("c5"), legId: 1 },
      { __id__: caseId("c6"), legId: 1 }
    ])
    // values are now [1,1,1,1,2,3]
    expect("quantiles" in t.config.legendNumericColorScale).toBe(false)  // repaired threshold scale
    expect(t.config.legendBinDataExtents).toEqual([
      { min: 1, max: 1 }, { min: 2, max: 2 }, { min: 3, max: 3 }
    ])

    // restore distinct values -> back to a standard quantile scale
    t.data.setCaseValues([
      { __id__: caseId("c4"), legId: 4 },
      { __id__: caseId("c5"), legId: 5 },
      { __id__: caseId("c6"), legId: 6 }
    ])
    expect("quantiles" in t.config.legendNumericColorScale).toBe(true)
    expect(t.config.legendBinDataExtents).toBeUndefined()
  })
})
