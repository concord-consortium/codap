import { applySnapshot, getSnapshot, SnapshotIn, types } from "mobx-state-tree"
import { DataSet } from "../../../models/data/data-set"
import { createDataSet } from "../../../models/data/data-set-conversion"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { isEmptyAxisModel } from "../../axis/models/axis-model"
import { isCategoricalAxisModel } from "../../axis/models/categorical-axis-models"
import { isNumericAxisModel } from "../../axis/models/numeric-axis-models"
import { AxisPlace } from "../../axis/axis-types"
import { attrRoleToGraphPlace, GraphAttrRole } from "../../data-display/data-display-types"
import { GraphContentModel } from "./graph-content-model"
import { GraphController } from "./graph-controller"
import { GraphLayout } from "./graph-layout"

const mockGetDataSet = jest.fn()
const mockGetMetadata = jest.fn()

jest.mock("../../../models/shared/shared-data-tile-utils", () => ({
  getDataSetFromId: () => mockGetDataSet(),
  getTileDataSet: () => mockGetDataSet(),
  getTileCaseMetadata: () => mockGetMetadata()
}))

const mockComputePointRadius = jest.fn(() => 5)
const mockMatchCirclesToData = jest.fn()

jest.mock("../../data-display/data-display-utils", () => ({
  computePointRadius: () => mockComputePointRadius(),
  matchCirclesToData: () => mockMatchCirclesToData()
}))

describe("GraphController", () => {

  const Tree = types.model("Tree", {
    model: types.optional(GraphContentModel, () => GraphContentModel.create()),
    data: types.optional(DataSet, () => createDataSet({
      attributes: [
        { id: "xId", name: "x", values: ["1", "2", "3"] },
        { id: "yId", name: "y", values: ["4", "5", "6"] },
        { id: "y2Id", name: "y2", values: ["7", "8", "9"] },
        { id: "cId", name: "c", values: ["a", "b", "c"] }
      ]
    })),
    metadata: types.optional(DataSetMetadata, () => DataSetMetadata.create())
  })

  const instanceId = "Graph1"

  let emptyPlotSnap: SnapshotIn<typeof Tree> | undefined
  let dotPlotSnap: SnapshotIn<typeof Tree> | undefined
  let dotChartSnap: SnapshotIn<typeof Tree> | undefined
  let scatterPlotSnap: SnapshotIn<typeof Tree> | undefined

  function setup() {
    const _tree = Tree.create()
    const { model: graphModel, data: dataSet, metadata } = _tree
    mockGetDataSet.mockRestore()
    mockGetDataSet.mockImplementation(() => dataSet)
    mockGetMetadata.mockRestore()
    mockGetMetadata.mockImplementation(() => metadata)
    const layout = new GraphLayout()
    const graphController = new GraphController({ layout, instanceId })
    graphController.setProperties(graphModel, {} as any)
    return { tree: _tree, model: graphModel, controller: graphController, data: dataSet }
  }

  let { tree, model, controller, data } = setup()

  function getScaleType(place: AxisPlace) {
    return controller.layout.getAxisMultiScale(place).scaleType
  }

  function setAttributeId(role: GraphAttrRole, attrId: string) {
    const place = attrRoleToGraphPlace[role]
    expect(place).toBeTruthy()
    model.setAttributeID(role, data.id, attrId)
    // in the full graph code, `syncModelWithAttributeConfiguration` is called by a MobX reaction,
    // which then triggers a call to `syncAxisScalesWithModel`, but here we call them directly for testing simplicity
    controller.handleAttributeAssignment()
    controller.syncAxisScalesWithModel()
  }

  it("methods bail appropriately when not fully defined", () => {
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(1)
    const _controller = new GraphController({
      layout: undefined as any,
      instanceId
    })
    _controller.syncAxisScalesWithModel()
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(1)
    _controller.clearGraph()
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(1)

    _controller.setProperties(model)
    _controller.syncAxisScalesWithModel()
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(1)
    _controller.callMatchCirclesToData()
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(1)

    _controller.setProperties(model)
    _controller.syncAxisScalesWithModel()
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(1)
    _controller.callMatchCirclesToData()
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(1)

  })

  it("handles attribute assignments and deserialization correctly", () => {
    ({ tree, model, controller, data } = setup())

    let matchCirclesCount = 1

    expect(controller.graphModel).toBe(model)
    emptyPlotSnap = getSnapshot(tree)
    expect(model.plotType).toBe("casePlot")
    expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // case plot => dot plot
    setAttributeId("x", "xId")
    dotPlotSnap = getSnapshot(tree)
    expect(model.plotType).toBe("dotPlot")
    // This, plus many "expects" below are commented out because it is too implementation dependent
    // See https://www.pivotaltracker.com/story/show/187849571
    // expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // dot plot => dot plot with legend
    setAttributeId("legend", "yId")
    expect(model.plotType).toBe("dotPlot")
    // See comment above
    // expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // dot plot => case plot
    setAttributeId("x", "")
    expect(model.plotType).toBe("casePlot")
    // See comment above
    // expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // case plot => dot plot
    setAttributeId("x", "xId")
    expect(model.plotType).toBe("dotPlot")
    // See comment above
    //     expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // dot plot => scatter plot
    setAttributeId("y", "yId")
    scatterPlotSnap = getSnapshot(tree)
    expect(model.plotType).toBe("scatterPlot")
    // See comment above
    //     expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // scatter plot => y2 scatter plot
    setAttributeId("yPlus", "y2Id")
    expect(model.plotType).toBe("scatterPlot")
    // See comment above
    //     expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // scatter plot => empty plot
    controller.clearGraph()
    controller.syncAxisScalesWithModel()  // triggered by reaction in Graph component normally
    expect(model.plotType).toBe("casePlot")
    // See comment above
    //     expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // empty plot => dot chart
    setAttributeId("y", "cId")
    dotChartSnap = getSnapshot(tree)
    expect(model.plotType).toBe("dotChart")
    // See comment above
    //     expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // dot chart => split dot chart
    setAttributeId("topSplit", "cId")
    expect(model.plotType).toBe("dotChart")
    // See comment above
    //     expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    // split dot chart => dot chart
    setAttributeId("topSplit", "")
    expect(model.plotType).toBe("dotChart")
    // See comment above
    //     expect(mockMatchCirclesToData).toHaveBeenCalledTimes(++matchCirclesCount)

    /*
     * deserialization
     */
    applySnapshot(tree, emptyPlotSnap)
    controller.syncAxisScalesWithModel()
    expect(model.plotType).toBe("casePlot")
    expect(isEmptyAxisModel(model.axes.get("bottom"))).toBe(true)
    expect(getScaleType("bottom")).toBe("ordinal")
    expect(isEmptyAxisModel(model.axes.get("left"))).toBe(true)
    expect(getScaleType("left")).toBe("ordinal")

    applySnapshot(tree, dotPlotSnap)
    controller.syncAxisScalesWithModel()
    expect(model.plotType).toBe("dotPlot")
    expect(isNumericAxisModel(model.axes.get("bottom"))).toBe(true)
    expect(getScaleType("bottom")).toBe("linear")
    expect(isEmptyAxisModel(model.axes.get("left"))).toBe(true)
    expect(getScaleType("left")).toBe("ordinal")

    applySnapshot(tree, dotChartSnap)
    controller.syncAxisScalesWithModel()
    expect(model.plotType).toBe("dotChart")
    expect(isEmptyAxisModel(model.axes.get("bottom"))).toBe(true)
    expect(getScaleType("bottom")).toBe("ordinal")
    expect(isCategoricalAxisModel(model.axes.get("left"))).toBe(true)
    expect(getScaleType("left")).toBe("band")

    applySnapshot(tree, scatterPlotSnap)
    controller.syncAxisScalesWithModel()
    expect(model.plotType).toBe("scatterPlot")
    expect(isNumericAxisModel(model.axes.get("bottom"))).toBe(true)
    expect(getScaleType("bottom")).toBe("linear")
    expect(isNumericAxisModel(model.axes.get("left"))).toBe(true)
    expect(getScaleType("left")).toBe("linear")
  })
})
