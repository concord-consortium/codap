import { Instance, types } from "mobx-state-tree"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { DataSetMetadata } from "../../models/shared/data-set-metadata"
import {
  defaultSelectedColor, defaultSelectedStroke, defaultSelectedStrokeOpacity, defaultSelectedStrokeWidth,
  defaultStrokeOpacity, defaultStrokeWidth
} from "../../utilities/color-utils"
import { GraphDataConfigurationModel } from "../graph/models/graph-data-configuration-model"
import { IPointStyle, PointRendererBase } from "./renderer"
import { setPointSelection } from "./data-display-utils"

const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
  config: GraphDataConfigurationModel
})

describe("setPointSelection", () => {
  let tree: Instance<typeof TreeModel>
  let mockRenderer: Partial<PointRendererBase>
  let styleUpdates: Map<unknown, Partial<IPointStyle>>
  let raisedPoints: Map<unknown, boolean>

  beforeEach(() => {
    tree = TreeModel.create({
      data: {},
      metadata: {},
      config: {}
    })
    tree.data.addAttribute({ id: "xId", name: "x" })
    tree.data.addAttribute({ id: "yId", name: "y" })
    tree.metadata.setData(tree.data)
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c1", x: 1, y: 1 },
      { __id__: "c2", x: 2, y: 2 },
      { __id__: "c3", x: 3, y: 3 }
    ]))
    tree.config.setDataset(tree.data, tree.metadata)
    tree.config.setAttribute("x", { attributeID: "xId" })
    tree.config.setAttribute("y", { attributeID: "yId" })

    styleUpdates = new Map()
    raisedPoints = new Map()

    const caseIdFromItemId = (itemId: string) => tree.data.getItemChildCaseId(itemId)!

    // Create mock points with metadata
    const mockPoints = [
      { point: { id: 1 }, metadata: { caseID: caseIdFromItemId("c1"), plotNum: 0 } },
      { point: { id: 2 }, metadata: { caseID: caseIdFromItemId("c2"), plotNum: 0 } },
      { point: { id: 3 }, metadata: { caseID: caseIdFromItemId("c3"), plotNum: 0 } }
    ]

    mockRenderer = {
      forEachPoint: jest.fn((callback: (point: unknown, metadata: { caseID: string, plotNum: number }) => void) => {
        mockPoints.forEach(({ point, metadata }) => callback(point, metadata))
      }),
      setPointStyle: jest.fn((point: unknown, style: Partial<IPointStyle>) => {
        styleUpdates.set(point, style)
      }),
      setPointRaised: jest.fn((point: unknown, raised: boolean) => {
        raisedPoints.set(point, raised)
      })
    }
  })

  it("uses blue selection fill for selected points with no legend", () => {
    const caseIdFromItemId = (itemId: string) => tree.data.getItemChildCaseId(itemId)
    // Select first case
    tree.data.setSelectedCases([caseIdFromItemId("c1")!])

    setPointSelection({
      renderer: mockRenderer as PointRendererBase,
      dataConfiguration: tree.config,
      pointRadius: 5,
      selectedPointRadius: 7,
      pointColor: "#ffffff",
      pointStrokeColor: "#000000"
    })

    // Find the style update for the selected point (c1)
    const selectedPointStyle = Array.from(styleUpdates.values()).find(
      (_, idx) => idx === 0
    )
    // Find the style update for an unselected point (c2)
    const unselectedPointStyle = Array.from(styleUpdates.values()).find(
      (_, idx) => idx === 1
    )

    // Selected point with no legend should have blue fill and normal stroke
    expect(selectedPointStyle?.fill).toBe(defaultSelectedColor)
    expect(selectedPointStyle?.stroke).toBe("#000000")
    expect(selectedPointStyle?.strokeWidth).toBe(defaultStrokeWidth)
    expect(selectedPointStyle?.strokeOpacity).toBe(defaultStrokeOpacity)
    expect(selectedPointStyle?.radius).toBe(7)

    // Unselected point should have the regular fill and stroke
    expect(unselectedPointStyle?.fill).toBe("#ffffff")
    expect(unselectedPointStyle?.stroke).toBe("#000000")
    expect(unselectedPointStyle?.strokeWidth).toBe(defaultStrokeWidth)
    expect(unselectedPointStyle?.strokeOpacity).toBe(defaultStrokeOpacity)
    expect(unselectedPointStyle?.radius).toBe(5)
  })

  it("uses selection stroke for selected points with legend", () => {
    const caseIdFromItemId = (itemId: string) => tree.data.getItemChildCaseId(itemId)
    // Add a categorical attribute for the legend
    tree.data.addAttribute({ id: "categoryId", name: "category" })
    tree.data.setCaseValues([
      { __id__: "c1", categoryId: "A" },
      { __id__: "c2", categoryId: "B" },
      { __id__: "c3", categoryId: "A" }
    ])
    tree.config.setAttribute("legend", { attributeID: "categoryId" })

    // Select first case
    tree.data.setSelectedCases([caseIdFromItemId("c1")!])

    setPointSelection({
      renderer: mockRenderer as PointRendererBase,
      dataConfiguration: tree.config,
      pointRadius: 5,
      selectedPointRadius: 7,
      pointColor: "#ffffff",
      pointStrokeColor: "#000000"
    })

    // Find the style update for the selected point (c1)
    const selectedPointStyle = Array.from(styleUpdates.values()).find(
      (_, idx) => idx === 0
    )

    // Selected point with legend should preserve legend fill and use selection stroke
    expect(selectedPointStyle?.fill).toBeDefined()
    expect(selectedPointStyle?.fill).not.toBe(defaultSelectedColor)
    expect(selectedPointStyle?.stroke).toBe(defaultSelectedStroke)
    expect(selectedPointStyle?.strokeWidth).toBe(defaultSelectedStrokeWidth)
    expect(selectedPointStyle?.strokeOpacity).toBe(defaultSelectedStrokeOpacity)
  })

  it("raises selected points and does not raise unselected points", () => {
    const caseIdFromItemId = (itemId: string) => tree.data.getItemChildCaseId(itemId)
    // Select first case
    tree.data.setSelectedCases([caseIdFromItemId("c1")!])

    setPointSelection({
      renderer: mockRenderer as PointRendererBase,
      dataConfiguration: tree.config,
      pointRadius: 5,
      selectedPointRadius: 7,
      pointColor: "#ffffff",
      pointStrokeColor: "#000000"
    })

    const raisedValues = Array.from(raisedPoints.values())
    // First point (c1) should be raised (selected)
    expect(raisedValues[0]).toBe(true)
    // Second and third points should not be raised (unselected)
    expect(raisedValues[1]).toBe(false)
    expect(raisedValues[2]).toBe(false)
  })

  it("does nothing when renderer is undefined", () => {
    setPointSelection({
      renderer: undefined,
      dataConfiguration: tree.config,
      pointRadius: 5,
      selectedPointRadius: 7,
      pointColor: "#ffffff",
      pointStrokeColor: "#000000"
    })

    // No style updates should have occurred
    expect(styleUpdates.size).toBe(0)
    expect(raisedPoints.size).toBe(0)
  })

  it("uses legend color for fill when legend attribute is set", () => {
    // Add a categorical attribute for the legend
    tree.data.addAttribute({ id: "categoryId", name: "category" })
    tree.data.setCaseValues([
      { __id__: "c1", categoryId: "A" },
      { __id__: "c2", categoryId: "B" },
      { __id__: "c3", categoryId: "A" }
    ])

    // Set the legend attribute
    tree.config.setAttribute("legend", { attributeID: "categoryId" })

    // Spy on getLegendColorForCase
    const getLegendColorSpy = jest.spyOn(tree.config, "getLegendColorForCase")

    setPointSelection({
      renderer: mockRenderer as PointRendererBase,
      dataConfiguration: tree.config,
      pointRadius: 5,
      selectedPointRadius: 7,
      pointColor: "#ffffff",
      pointStrokeColor: "#000000"
    })

    // getLegendColorForCase should have been called for each point
    expect(getLegendColorSpy).toHaveBeenCalledTimes(3)

    // Verify that each point's fill color comes from the legend
    const styleValues = Array.from(styleUpdates.values())
    styleValues.forEach(style => {
      // Fill should not be the default pointColor since legend is set
      // The actual color comes from getLegendColorForCase
      expect(style.fill).toBeDefined()
    })

    getLegendColorSpy.mockRestore()
  })

  it("uses pointColor for fill when no legend attribute is set", () => {
    // Spy on getLegendColorForCase - it should NOT be called
    const getLegendColorSpy = jest.spyOn(tree.config, "getLegendColorForCase")

    setPointSelection({
      renderer: mockRenderer as PointRendererBase,
      dataConfiguration: tree.config,
      pointRadius: 5,
      selectedPointRadius: 7,
      pointColor: "#abcdef",
      pointStrokeColor: "#000000"
    })

    // getLegendColorForCase should NOT have been called
    expect(getLegendColorSpy).not.toHaveBeenCalled()

    // All points should have the default pointColor
    const styleValues = Array.from(styleUpdates.values())
    styleValues.forEach(style => {
      expect(style.fill).toBe("#abcdef")
    })

    getLegendColorSpy.mockRestore()
  })
})
