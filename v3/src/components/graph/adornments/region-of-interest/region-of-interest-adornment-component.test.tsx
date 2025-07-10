import React, { createRef } from "react"
import { render, screen } from "@testing-library/react"
import { RegionOfInterestAdornment } from "./region-of-interest-adornment-component"
import { IRegionOfInterestAdornmentModel, RegionOfInterestAdornmentModel } from "./region-of-interest-adornment-model"

const plotHeight = 200
const plotWidth = 300

jest.mock("../../hooks/use-graph-content-model-context", () => ({
  useGraphContentModelContext: jest.fn(() => ({})),
}))

jest.mock("../../hooks/use-adornment-attributes", () => ({
  useAdornmentAttributes: jest.fn(() => ({
    dataConfig: {
      primaryRole: "x",
      secondaryRole: "y",
    },
    xScale: (value: number) => value,
    yScale: (value: number) => plotHeight - value, // simulate inverted y axis
  })),
}))

const renderWithAdornment = (model: IRegionOfInterestAdornmentModel) => {
  // The ROI is rendered in the adornment spanner, so we need to mock that here.
  const spannerRef = createRef<SVGSVGElement>()
  render(
    <svg ref={spannerRef}>
      <RegionOfInterestAdornment
        cellKey={{}}
        cellCoords={{ row: 0, col: 0 }}
        containerId="test-container"
        model={model}
        plotHeight={plotHeight}
        plotWidth={plotWidth}
        spannerRef={spannerRef}
      />
    </svg>
  )
  return screen.getByTestId("region-of-interest")
}

describe("RegionOfInterestComponent", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render correctly with percent values", () => {
    const model = RegionOfInterestAdornmentModel.create({
      id: "ADRN123",
      isVisible: true,
      type: "Region of Interest",
      primary: { position: "10%", extent: "10%" },
      secondary: { position: "5%", extent: "90%" }
    })

    const view = renderWithAdornment(model)
    expect(view).toHaveAttribute("class", "region-of-interest")
    expect(view).toHaveAttribute("x", `${plotWidth * 0.1}`) // 10% (position) of 300
    expect(view).toHaveAttribute("y", `${plotHeight * 0.05}`) // 5% (position) of 200
    expect(view).toHaveAttribute("width", `${plotWidth * .1}`) // 10% (extent) of 300
    expect(view).toHaveAttribute("height", `${plotHeight * .9}`) // 90% (extent) of 200
  })

  it("should render correctly with coordinate values", () => {
    const model = RegionOfInterestAdornmentModel.create({
      id: "ADRN125",
      isVisible: true,
      type: "Region of Interest",
      primary: { position: 20, extent: 50 },
      secondary: { position: 50, extent: 100 }
    })

    const view = renderWithAdornment(model)
    expect(view).toHaveAttribute("x", "20")
    expect(view).toHaveAttribute("y", `${plotHeight - 100 - 50}`) // plotHeight - 100 (extent) - 50 (position)
    expect(view).toHaveAttribute("width", "50")
    expect(view).toHaveAttribute("height", "100")
  })

  it("should render correctly when primaryRole is y and the graph is not a scatterPlot", () => {
    jest.mocked(require("../../hooks/use-adornment-attributes").useAdornmentAttributes).mockReturnValue({
      dataConfig: {
        primaryRole: "y",
        secondaryRole: "x",
      },
      graphModel: {
        plotType: "dotPlot",
      },
      yScale: (value: number) => plotHeight - value,
    })

    const model = RegionOfInterestAdornmentModel.create({
      id: "ADRN124",
      isVisible: true,
      type: "Region of Interest",
      primary: { position: 0, extent: "10%" },
      secondary: { position: 0, extent: "100%" }
    })

    const view = renderWithAdornment(model)
    expect(view).toHaveAttribute("x", "0")
    expect(view).toHaveAttribute("y", `${plotHeight - 20}`) // 200 - 10% (extent) of 200
    expect(view).toHaveAttribute("height", `${plotHeight * 0.1}`) // 10% (extent) of 200
    expect(view).toHaveAttribute("width", `${plotWidth}`)
  })

  it("should ignore primaryRole and render correctly when the graph is a scatterPlot", () => {
    jest.mocked(require("../../hooks/use-adornment-attributes").useAdornmentAttributes).mockReturnValue({
      dataConfig: {
        primaryRole: "y",
        secondaryRole: "x",
      },
      graphModel: {
        plotType: "scatterPlot",
      },
      xScale: (value: number) => value,
      yScale: (value: number) => plotHeight - value,
    })

    const model = RegionOfInterestAdornmentModel.create({
      id: "ADRN124",
      isVisible: true,
      type: "Region of Interest",
      primary: { position: 0, extent: "10%" },
      secondary: { position: 0, extent: "100%" }
    })

    const view = renderWithAdornment(model)
    expect(view).toHaveAttribute("x", "0")
    expect(view).toHaveAttribute("y", "0")
    expect(view).toHaveAttribute("width", `${plotWidth * 0.1}`) // 10% (extent) of 200
    expect(view).toHaveAttribute("height", `${plotHeight}`)
  })
})
