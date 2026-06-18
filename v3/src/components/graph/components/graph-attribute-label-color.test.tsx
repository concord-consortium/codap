/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import { act, render } from "@testing-library/react"
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

// Unlike graph-attribute-label.test.tsx, which mocks AttributeLabel as an inert <g> to avoid
// portal setup, this mock drives refreshLabel inside a MobX autorun so the real refreshAxisTitle
// runs (and re-runs reactively). That lets us assert the SVG text fill the label actually renders.
jest.mock("../../data-display/components/attribute-label", () => {
  const ReactModule = require("react")
  const { autorun } = require("mobx")
  return {
    AttributeLabel: ReactModule.forwardRef(function MockAttributeLabel(
      props: { place: string, refreshLabel: () => void },
      ref: React.ForwardedRef<SVGGElement>
    ) {
      const { refreshLabel } = props
      ReactModule.useEffect(() => {
        const disposer = autorun(() => refreshLabel())
        return disposer
      }, [refreshLabel])
      return <g ref={ref} data-testid={`attribute-label-${props.place}`} />
    })
  }
})

describe("GraphAttributeLabel Y2 (rightNumeric) color", () => {
  let dataSet: typeof DataSet.Type
  let metadata: typeof DataSetMetadata.Type
  let dataConfiguration: typeof GraphDataConfigurationModel.Type
  let layout: GraphLayout
  let pointDescription: typeof DisplayItemDescriptionModel.Type

  const createMockGraphModel = () => ({
    type: "Graph",
    plotType: "scatterPlot",
    pointDescription,
    pointsFusedIntoBars: false,
    plot: {
      type: "scatterPlot",
      hasCountPercentFormulaAxis: false,
      countPercentFormulaAxisLabel: "",
      axisLabelClickHandler: () => undefined
    }
  })

  const mockTileSelectionContext = {
    isTileSelected: () => false,
    selectTile: () => undefined,
    addFocusIgnoreFn: () => () => undefined
  }

  const renderLabel = (place: "left" | "rightNumeric") => {
    return render(
      <TileSelectionContext.Provider value={mockTileSelectionContext}>
        <GraphContentModelContext.Provider value={createMockGraphModel() as any}>
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

  const labelFill = (container: HTMLElement, place: string) =>
    container.querySelector(`[data-testid='attribute-label-${place}'] text`)?.getAttribute("style") ?? ""

  // jsdom doesn't implement getBBox, which renderLabelBackground (called by refreshAxisTitle) needs.
  // Save and restore the original so we don't pollute other test files sharing this Jest worker.
  const originalGetBBox = (SVGElement.prototype as any).getBBox
  beforeAll(() => {
    ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 })
  })
  afterAll(() => {
    ;(SVGElement.prototype as any).getBBox = originalGetBBox
  })

  beforeEach(() => {
    dataSet = DataSet.create({ name: "Test Data" })
    dataSet.addAttribute({ id: "xId", name: "X" })
    dataSet.addAttribute({ id: "y1Id", name: "Height" })
    dataSet.addAttribute({ id: "y2Id", name: "Weight" })

    metadata = DataSetMetadata.create()
    metadata.setData(dataSet)

    dataConfiguration = GraphDataConfigurationModel.create()
    dataConfiguration.setDataset(dataSet, metadata)
    dataConfiguration.setAttribute("x", { attributeID: "xId" })
    dataConfiguration.setAttribute("y", { attributeID: "y1Id" })

    layout = new GraphLayout()
    layout.setTileExtent(400, 300)

    pointDescription = DisplayItemDescriptionModel.create()
  })

  it("colors the rightNumeric label to match its points when a Y2 attribute is present", () => {
    // With one primary Y attribute, the Y2 attribute's plot index is 1.
    pointDescription.setPointColor("#123456", 1)
    dataConfiguration.setAttribute("rightNumeric", { attributeID: "y2Id" })

    const { container } = renderLabel("rightNumeric")
    expect(pointDescription.pointColorAtIndex(1)).toBe("#123456")
    expect(labelFill(container, "rightNumeric")).toContain(`fill: ${pointDescription.pointColorAtIndex(1)}`)
  })

  it("updates the rightNumeric label color when the Y2 point color changes", () => {
    pointDescription.setPointColor("#123456", 1)
    dataConfiguration.setAttribute("rightNumeric", { attributeID: "y2Id" })

    const { container } = renderLabel("rightNumeric")
    expect(labelFill(container, "rightNumeric")).toContain("fill: #123456")

    act(() => pointDescription.setPointColor("#abcdef", 1))
    expect(labelFill(container, "rightNumeric")).toContain("fill: #abcdef")
  })

  it("does not set an inline fill on a primary (non-rightNumeric) label", () => {
    const { container } = renderLabel("left")
    // The label text is rendered (non-empty inline style) but carries no fill, so it falls back
    // to its CSS class color rather than a point color.
    const style = labelFill(container, "left")
    expect(style).not.toBe("")
    expect(style).not.toContain("fill:")
  })
})
/* eslint-enable testing-library/no-node-access, testing-library/no-container */
