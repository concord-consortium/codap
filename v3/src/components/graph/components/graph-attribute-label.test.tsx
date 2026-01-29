/* eslint-disable testing-library/no-node-access */
import { render } from "@testing-library/react"
import React from "react"
import { DataSet } from "../../../models/data/data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { GraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { GraphDataConfigurationContext } from "../hooks/use-graph-data-configuration-context"
import { GraphLayoutContext } from "../hooks/use-graph-layout-context"
import { TileSelectionContext } from "../../../hooks/use-tile-selection-context"
import { GraphAttributeLabel } from "./graph-attribute-label"
import { GraphDataConfigurationModel } from "../models/graph-data-configuration-model"
import { GraphLayout } from "../models/graph-layout"
import { DisplayItemDescriptionModel } from "../../data-display/models/display-item-description-model"

// Mock the AttributeLabel component to avoid needing all the portal setup
jest.mock("../../data-display/components/attribute-label", () => ({
  AttributeLabel: React.forwardRef(function MockAttributeLabel(
    props: { place: string, attrIdOverride?: string },
    ref: React.ForwardedRef<SVGGElement>
  ) {
    return (
      <g ref={ref} data-testid={`attribute-label-${props.place}`} data-attr-id={props.attrIdOverride || "default"} />
    )
  })
}))

// Mock the ClickableAxisLabel component
jest.mock("./clickable-axis-label", () => ({
  ClickableAxisLabel: React.forwardRef(function MockClickableAxisLabel(
    props: { place: string },
    ref: React.ForwardedRef<SVGGElement>
  ) {
    return <g ref={ref} data-testid={`clickable-axis-label-${props.place}`} />
  })
}))

describe("GraphAttributeLabel", () => {
  let dataSet: typeof DataSet.Type
  let metadata: typeof DataSetMetadata.Type
  let dataConfiguration: typeof GraphDataConfigurationModel.Type
  let layout: GraphLayout
  let pointDescription: typeof DisplayItemDescriptionModel.Type

  const createMockGraphModel = (plotType: string) => ({
    type: "Graph",
    plotType,
    pointDescription,
    pointsFusedIntoBars: false,
    plot: {
      type: plotType,
      hasCountPercentFormulaAxis: false,
      countPercentFormulaAxisLabel: "",
      axisLabelClickHandler: () => undefined
    }
  })

  const mockTileSelectionContext = {
    isTileSelected: () => false
  }

  const renderWithProviders = (
    graphModel: ReturnType<typeof createMockGraphModel>,
    place: "left" | "bottom" | "top" | "legend" = "left"
  ) => {
    return render(
      <TileSelectionContext.Provider value={mockTileSelectionContext}>
        <GraphContentModelContext.Provider value={graphModel as any}>
          <GraphDataConfigurationContext.Provider value={dataConfiguration}>
            <GraphLayoutContext.Provider value={layout}>
              <svg>
                <GraphAttributeLabel
                  place={place}
                  onChangeAttribute={jest.fn()}
                  onRemoveAttribute={jest.fn()}
                  onTreatAttributeAs={jest.fn()}
                />
              </svg>
            </GraphLayoutContext.Provider>
          </GraphDataConfigurationContext.Provider>
        </GraphContentModelContext.Provider>
      </TileSelectionContext.Provider>
    )
  }

  beforeEach(() => {
    // Create a dataset with attributes
    dataSet = DataSet.create({ name: "Test Data" })
    dataSet.addAttribute({ id: "xId", name: "X" })
    dataSet.addAttribute({ id: "y1Id", name: "Height" })
    dataSet.addAttribute({ id: "y2Id", name: "Weight" })
    dataSet.addAttribute({ id: "y3Id", name: "Sleep" })

    // Create metadata
    metadata = DataSetMetadata.create()
    metadata.setData(dataSet)

    // Create data configuration
    dataConfiguration = GraphDataConfigurationModel.create()
    dataConfiguration.setDataset(dataSet, metadata)

    // Create layout with bounds
    layout = new GraphLayout()
    layout.setTileExtent(400, 300)

    // Create point description model
    pointDescription = DisplayItemDescriptionModel.create()
  })

  describe("with single y-attribute", () => {
    beforeEach(() => {
      dataConfiguration.setAttribute("x", { attributeID: "xId" })
      dataConfiguration.setAttribute("y", { attributeID: "y1Id" })
    })

    it("renders a single label for a scatterplot with one y-attribute", () => {
      const graphModel = createMockGraphModel("scatterPlot")
      const { container } = renderWithProviders(graphModel)

      // Should render exactly one attribute label
      const labels = container.querySelectorAll("[data-testid='attribute-label-left']")
      expect(labels).toHaveLength(1)
    })

    it("renders a single label for non-scatterplot types", () => {
      const graphModel = createMockGraphModel("dotPlot")
      const { container } = renderWithProviders(graphModel)

      const labels = container.querySelectorAll("[data-testid='attribute-label-left']")
      expect(labels).toHaveLength(1)
    })
  })

  describe("with multiple y-attributes", () => {
    beforeEach(() => {
      dataConfiguration.setAttribute("x", { attributeID: "xId" })
      dataConfiguration.setAttribute("y", { attributeID: "y1Id" })
      dataConfiguration.addYAttribute({ attributeID: "y2Id" })
      dataConfiguration.addYAttribute({ attributeID: "y3Id" })
    })

    it("renders separate labels for each y-attribute on a scatterplot", () => {
      const graphModel = createMockGraphModel("scatterPlot")
      const { container } = renderWithProviders(graphModel)

      // Should render three separate attribute labels (one for each y-attribute)
      const labels = container.querySelectorAll("[data-testid='attribute-label-left']")
      expect(labels).toHaveLength(3)
    })

    it("passes the correct attrIdOverride to each label", () => {
      const graphModel = createMockGraphModel("scatterPlot")
      const { container } = renderWithProviders(graphModel)

      const labels = container.querySelectorAll("[data-testid='attribute-label-left']")

      // Each label should have the correct attribute ID
      expect(labels[0].getAttribute("data-attr-id")).toBe("y1Id")
      expect(labels[1].getAttribute("data-attr-id")).toBe("y2Id")
      expect(labels[2].getAttribute("data-attr-id")).toBe("y3Id")
    })

    it("renders a single combined label for non-scatterplot types", () => {
      const graphModel = createMockGraphModel("dotPlot")
      const { container } = renderWithProviders(graphModel)

      // Non-scatterplot should still show single label even with multiple y-attributes
      const labels = container.querySelectorAll("[data-testid='attribute-label-left']")
      expect(labels).toHaveLength(1)
    })
  })

  describe("bottom axis label", () => {
    beforeEach(() => {
      dataConfiguration.setAttribute("x", { attributeID: "xId" })
      dataConfiguration.setAttribute("y", { attributeID: "y1Id" })
      dataConfiguration.addYAttribute({ attributeID: "y2Id" })
    })

    it("renders a single label on the bottom axis regardless of y-attributes", () => {
      const graphModel = createMockGraphModel("scatterPlot")
      const { container } = renderWithProviders(graphModel, "bottom")

      // Bottom axis should always have a single label
      const labels = container.querySelectorAll("[data-testid='attribute-label-bottom']")
      expect(labels).toHaveLength(1)
    })
  })
})
/* eslint-enable testing-library/no-node-access */
