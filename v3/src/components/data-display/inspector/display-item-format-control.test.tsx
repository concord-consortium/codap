import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { featureFlagManager } from "../../../models/feature-flags/feature-flag-manager"
import { DisplayItemFormatControl } from "./display-item-format-control"

// Mock translation to return the key
jest.mock("../../../utilities/translation/translate", () => ({
  t: (key: string) => key
}))

// Mock ColorSetting to render a simple swatch button
jest.mock("../../common/color-setting", () => ({
  ColorSetting: ({ propertyLabel, onColorChange, disabled }: any) => (
    <button data-testid={`color-swatch-${propertyLabel}`} disabled={disabled}
      onClick={() => onColorChange("#123456")}>
      {propertyLabel}
    </button>
  )
}))

// Mock sub-components to isolate DisplayItemFormatControl
jest.mock("./point-size-slider", () => ({
  PointSizeSlider: ({ pointDisplayType, disabled }: any) => (
    <div data-testid="point-size-slider" data-display-type={pointDisplayType} data-disabled={!!disabled}>
      PointSizeSlider
    </div>
  )
}))

jest.mock("./legend-color-controls", () => ({
  LegendColorControls: ({ disabled }: any) =>
    <div data-testid="legend-color-controls" data-disabled={!!disabled}>LegendColorControls</div>,
  LegendBinsSelect: ({ disabled }: any) =>
    <div data-testid="legend-bins-select" data-disabled={!!disabled}>LegendBinsSelect</div>,
  LegendBinCountInput: ({ disabled }: any) =>
    <div data-testid="legend-bin-count-input" data-disabled={!!disabled}>LegendBinCountInput</div>,
  LegendRangeInputs: ({ disabled }: any) =>
    <div data-testid="legend-range-inputs" data-disabled={!!disabled}>LegendRangeInputs</div>
}))

jest.mock("./plot-background-controls", () => ({
  PlotBackgroundControls: () => <div data-testid="plot-background-controls">PlotBackgroundControls</div>
}))

// Mock isMapPointDisplayType
jest.mock("../../map/models/map-point-layer-model", () => ({
  isMapPointDisplayType: (val: string) => ["points", "heatmap"].includes(val)
}))

// Mock SCSS import
jest.mock("./display-item-format-control.scss", () => ({}))

const createMockDescription = (overrides?: Record<string, unknown>) => ({
  pointSizeMultiplier: 1,
  pointStrokeColor: "#000000",
  pointStrokeSameAsFill: false,
  setPointStrokeColor: jest.fn(),
  setPointStrokeSameAsFill: jest.fn(),
  applyModelChange: jest.fn((fn: () => void) => fn()),
  ...overrides,
  // derived as it is on the real model, so a test that sets a negative size gets a polygon
  get isPolygon(): boolean { return this.pointSizeMultiplier < 0 }
})

const createMockDataConfig = (overrides?: Record<string, unknown>) => ({
  attributeID: jest.fn(() => ""),
  attributeType: jest.fn(() => undefined),
  ...overrides
})

const createMockMapPointLayer = (overrides?: Record<string, unknown>) => ({
  id: "layer-1",
  displayType: "points",
  pointsAreVisible: true,
  setDisplayType: jest.fn(),
  setPointsAreVisible: jest.fn(),
  applyModelChange: jest.fn((fn: () => void) => fn()),
  ...overrides
})

describe("DisplayItemFormatControl", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // wrap in act so the reactive re-render from clearing flags, on any component
    // still mounted at teardown, doesn't warn about updates outside act()
    act(() => featureFlagManager.setServerConfig({}))
  })

  it("renders slider, legend controls, and stroke section", () => {
    const desc = createMockDescription()
    const config = createMockDataConfig()
    render(
      <DisplayItemFormatControl
        dataConfiguration={config as any}
        displayItemDescription={desc as any}
      />
    )

    expect(screen.getByTestId("point-size-slider")).toBeInTheDocument()
    expect(screen.getByTestId("legend-color-controls")).toBeInTheDocument()
    expect(screen.getByTestId("color-swatch-DG.Inspector.stroke")).toBeInTheDocument()
    expect(screen.getByTestId("stroke-same-as-fill-checkbox")).toBeInTheDocument()
  })

  it("hides slider when pointSizeMultiplier is negative (polygon mode)", () => {
    const desc = createMockDescription({ pointSizeMultiplier: -1 })
    const config = createMockDataConfig()
    render(
      <DisplayItemFormatControl
        dataConfiguration={config as any}
        displayItemDescription={desc as any}
      />
    )

    expect(screen.queryByTestId("point-size-slider")).not.toBeInTheDocument()
  })

  it("shows the flagged numeric legend controls when their flags are on", () => {
    featureFlagManager.setServerConfig({ legendBinCount: "on", legendRange: "on" })
    const desc = createMockDescription()
    const config = createMockDataConfig({
      attributeType: jest.fn(() => "numeric")
    })
    render(
      <DisplayItemFormatControl
        dataConfiguration={config as any}
        displayItemDescription={desc as any}
      />
    )

    expect(screen.getByTestId("legend-bins-select")).toBeInTheDocument()
    expect(screen.getByTestId("legend-bin-count-input")).toBeInTheDocument()
    expect(screen.getByTestId("legend-range-inputs")).toBeInTheDocument()
  })

  it("hides the numeric legend controls for a legend the display cannot honor", () => {
    /*
     * Every point is drawn in the missing-value color in that state, so binning and range have
     * nothing to act on. The palette drops its own rows for it; these are its siblings and need
     * the same gate.
     */
    featureFlagManager.setServerConfig({ legendBinCount: "on", legendRange: "on" })
    const desc = createMockDescription()
    const config = createMockDataConfig({
      attributeType: jest.fn(() => "numeric"),
      legendAttributeIsInoperable: true
    })
    render(
      <DisplayItemFormatControl
        dataConfiguration={config as any}
        displayItemDescription={desc as any}
      />
    )

    expect(screen.queryByTestId("legend-bins-select")).not.toBeInTheDocument()
    expect(screen.queryByTestId("legend-bin-count-input")).not.toBeInTheDocument()
    expect(screen.queryByTestId("legend-range-inputs")).not.toBeInTheDocument()
  })

  it("hides the flagged numeric legend controls when their flags are off", () => {
    const desc = createMockDescription()
    const config = createMockDataConfig({
      attributeType: jest.fn(() => "numeric")
    })
    render(
      <DisplayItemFormatControl
        dataConfiguration={config as any}
        displayItemDescription={desc as any}
      />
    )

    // the always-on binning-type selector remains for numeric legends
    expect(screen.getByTestId("legend-bins-select")).toBeInTheDocument()
    // the flagged controls do not
    expect(screen.queryByTestId("legend-bin-count-input")).not.toBeInTheDocument()
    expect(screen.queryByTestId("legend-range-inputs")).not.toBeInTheDocument()
  })

  it("hides LegendBinsSelect and LegendRangeInputs when legend attribute is not numeric", () => {
    const desc = createMockDescription()
    const config = createMockDataConfig({
      attributeType: jest.fn(() => "categorical")
    })
    render(
      <DisplayItemFormatControl
        dataConfiguration={config as any}
        displayItemDescription={desc as any}
      />
    )

    expect(screen.queryByTestId("legend-bins-select")).not.toBeInTheDocument()
    expect(screen.queryByTestId("legend-bin-count-input")).not.toBeInTheDocument()
    expect(screen.queryByTestId("legend-range-inputs")).not.toBeInTheDocument()
  })

  describe("stroke controls", () => {
    it("calls applyModelChange when stroke color changes", async () => {
      const user = userEvent.setup()
      const desc = createMockDescription()
      const config = createMockDataConfig()
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
        />
      )

      await user.click(screen.getByTestId("color-swatch-DG.Inspector.stroke"))
      expect(desc.applyModelChange).toHaveBeenCalled()
      expect(desc.setPointStrokeColor).toHaveBeenCalledWith("#123456")
    })

    it("toggles stroke-same-as-fill checkbox", async () => {
      const user = userEvent.setup()
      const desc = createMockDescription()
      const config = createMockDataConfig()
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
        />
      )

      await user.click(screen.getByTestId("stroke-same-as-fill-checkbox"))
      expect(desc.applyModelChange).toHaveBeenCalled()
      expect(desc.setPointStrokeSameAsFill).toHaveBeenCalledWith(true)
    })

    it("adds disabled class to stroke section when pointStrokeSameAsFill is true", () => {
      const desc = createMockDescription({ pointStrokeSameAsFill: true })
      const config = createMockDataConfig()
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
        />
      )

      const swatch = screen.getByTestId("color-swatch-DG.Inspector.stroke")
      // eslint-disable-next-line testing-library/no-node-access
      expect(swatch.closest(".stroke-section")).toHaveClass("disabled")
    })

    it("shows checkbox as selected when stroke same as fill", () => {
      const desc = createMockDescription({ pointStrokeSameAsFill: true })
      const config = createMockDataConfig()
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
        />
      )

      const checkbox = screen.getByTestId("stroke-same-as-fill-checkbox")
      expect(checkbox).toHaveAttribute("data-selected", "true")
    })
  })

  describe("map point type radio buttons", () => {
    it("shows radio buttons when mapPointLayerModel and legendAttrID are present", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({ attributeID: jest.fn(() => "legend-attr-1") })
      const mapModel = {
        displayType: "points",
        setDisplayType: jest.fn(),
        applyModelChange: jest.fn((fn: () => void) => fn())
      }
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
          mapPointLayerModel={mapModel as any}
        />
      )

      expect(screen.getByTestId("point-type-points-radio-button")).toBeInTheDocument()
      expect(screen.getByTestId("point-type-heatmap-radio-button")).toBeInTheDocument()
    })

    it("hides radio buttons when no mapPointLayerModel", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({ attributeID: jest.fn(() => "legend-attr-1") })
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
        />
      )

      expect(screen.queryByTestId("point-type-points-radio-button")).not.toBeInTheDocument()
    })

    it("hides radio buttons when no legend attribute", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig()
      const mapModel = {
        displayType: "points",
        setDisplayType: jest.fn(),
        applyModelChange: jest.fn((fn: () => void) => fn())
      }
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
          mapPointLayerModel={mapModel as any}
        />
      )

      expect(screen.queryByTestId("point-type-points-radio-button")).not.toBeInTheDocument()
    })
  })

  describe("points visibility toggle", () => {
    const kPointsToggleTestId = "map-layers-checkbox-points-layer-1"

    it("shows the Points checkbox for a map point layer", () => {
      render(
        <DisplayItemFormatControl
          dataConfiguration={createMockDataConfig() as any}
          displayItemDescription={createMockDescription() as any}
          mapPointLayerModel={createMockMapPointLayer() as any}
        />
      )

      const checkbox = screen.getByTestId(kPointsToggleTestId)
      expect(checkbox).toHaveTextContent("DG.Inspector.mapPoints")
      expect(checkbox).toHaveAttribute("data-selected", "true")
    })

    it("omits the Points checkbox when there is no map point layer", () => {
      render(
        <DisplayItemFormatControl
          dataConfiguration={createMockDataConfig() as any}
          displayItemDescription={createMockDescription() as any}
        />
      )

      expect(screen.queryByTestId(kPointsToggleTestId)).not.toBeInTheDocument()
      expect(screen.queryByRole("checkbox", { name: "DG.Inspector.mapPoints" })).not.toBeInTheDocument()
    })

    it("hides the layer's points when the Points checkbox is unchecked", async () => {
      const user = userEvent.setup()
      const layer = createMockMapPointLayer()
      render(
        <DisplayItemFormatControl
          dataConfiguration={createMockDataConfig() as any}
          displayItemDescription={createMockDescription() as any}
          mapPointLayerModel={layer as any}
        />
      )

      await user.click(screen.getByRole("checkbox", { name: "DG.Inspector.mapPoints" }))
      expect(layer.applyModelChange).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({
        undoStringKey: "DG.Undo.map.hidePoints",
        redoStringKey: "DG.Redo.map.hidePoints"
      }))
      expect(layer.setPointsAreVisible).toHaveBeenCalledWith(false)
    })

    it("shows the layer's points when the Points checkbox is checked", async () => {
      const user = userEvent.setup()
      const layer = createMockMapPointLayer({ pointsAreVisible: false })
      render(
        <DisplayItemFormatControl
          dataConfiguration={createMockDataConfig() as any}
          displayItemDescription={createMockDescription() as any}
          mapPointLayerModel={layer as any}
        />
      )

      await user.click(screen.getByRole("checkbox", { name: "DG.Inspector.mapPoints" }))
      expect(layer.setPointsAreVisible).toHaveBeenCalledWith(true)
    })
  })

  describe("disabling options when points are hidden", () => {
    beforeEach(() => {
      featureFlagManager.setServerConfig({ legendBinCount: "on", legendRange: "on" })
    })

    const renderWithLayer = (pointsAreVisible: boolean) => render(
      <DisplayItemFormatControl
        dataConfiguration={createMockDataConfig({
          attributeID: jest.fn(() => "legend-attr-1"),
          attributeType: jest.fn(() => "numeric")
        }) as any}
        displayItemDescription={createMockDescription() as any}
        mapPointLayerModel={createMockMapPointLayer({ pointsAreVisible }) as any}
      />
    )

    it("disables every option except the Points checkbox when the layer's points are hidden", () => {
      renderWithLayer(false)

      // The Points checkbox stays live, or there would be no way to show the points again.
      expect(screen.getByRole("checkbox", { name: "DG.Inspector.mapPoints" })).toBeEnabled()

      expect(screen.getByRole("radio", { name: "V3.map.inspector.displayAsPoints" })).toBeDisabled()
      expect(screen.getByRole("radio", { name: "V3.map.inspector.displayAsHeatmap" })).toBeDisabled()
      expect(screen.getByTestId("point-size-slider")).toHaveAttribute("data-disabled", "true")
      expect(screen.getByTestId("legend-color-controls")).toHaveAttribute("data-disabled", "true")
      expect(screen.getByTestId("legend-bins-select")).toHaveAttribute("data-disabled", "true")
      expect(screen.getByTestId("legend-bin-count-input")).toHaveAttribute("data-disabled", "true")
      expect(screen.getByTestId("legend-range-inputs")).toHaveAttribute("data-disabled", "true")
      expect(screen.getByTestId("color-swatch-DG.Inspector.stroke")).toBeDisabled()
      expect(screen.getByRole("checkbox", { name: "DG.Inspector.strokeSameAsFill" })).toBeDisabled()
    })

    it("shows the stroke section as disabled when the layer's points are hidden", () => {
      renderWithLayer(false)

      const swatch = screen.getByTestId("color-swatch-DG.Inspector.stroke")
      // eslint-disable-next-line testing-library/no-node-access
      const strokeSection = swatch.closest(".stroke-section")
      expect(strokeSection).toHaveClass("disabled")
      expect(strokeSection).toHaveAttribute("aria-disabled", "true")
    })

    it("leaves every option enabled when the layer's points are visible", () => {
      renderWithLayer(true)

      expect(screen.getByRole("radio", { name: "V3.map.inspector.displayAsPoints" })).toBeEnabled()
      expect(screen.getByTestId("point-size-slider")).toHaveAttribute("data-disabled", "false")
      expect(screen.getByTestId("legend-color-controls")).toHaveAttribute("data-disabled", "false")
      expect(screen.getByTestId("legend-bins-select")).toHaveAttribute("data-disabled", "false")
      expect(screen.getByTestId("legend-bin-count-input")).toHaveAttribute("data-disabled", "false")
      expect(screen.getByTestId("legend-range-inputs")).toHaveAttribute("data-disabled", "false")
      expect(screen.getByTestId("color-swatch-DG.Inspector.stroke")).toBeEnabled()
      expect(screen.getByRole("checkbox", { name: "DG.Inspector.strokeSameAsFill" })).toBeEnabled()
      // eslint-disable-next-line testing-library/no-node-access
      expect(screen.getByTestId("color-swatch-DG.Inspector.stroke").closest(".stroke-section"))
        .not.toHaveClass("disabled")
    })

    it("never disables options for a display without a map point layer (e.g. a graph)", () => {
      render(
        <DisplayItemFormatControl
          dataConfiguration={createMockDataConfig({ attributeType: jest.fn(() => "numeric") }) as any}
          displayItemDescription={createMockDescription() as any}
        />
      )

      expect(screen.getByTestId("point-size-slider")).toHaveAttribute("data-disabled", "false")
      expect(screen.getByTestId("legend-color-controls")).toHaveAttribute("data-disabled", "false")
      expect(screen.getByTestId("color-swatch-DG.Inspector.stroke")).toBeEnabled()
      expect(screen.getByRole("checkbox", { name: "DG.Inspector.strokeSameAsFill" })).toBeEnabled()
    })
  })

  describe("background controls", () => {
    it("shows PlotBackgroundControls when callbacks are provided", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig()
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
          onBackgroundTransparencyChange={jest.fn()}
          onBackgroundColorChange={jest.fn()}
        />
      )

      expect(screen.getByTestId("plot-background-controls")).toBeInTheDocument()
    })

    it("hides PlotBackgroundControls when callbacks are not provided", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig()
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
        />
      )

      expect(screen.queryByTestId("plot-background-controls")).not.toBeInTheDocument()
    })

    it("hides PlotBackgroundControls when only one callback is provided", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig()
      render(
        <DisplayItemFormatControl
          dataConfiguration={config as any}
          displayItemDescription={desc as any}
          onBackgroundTransparencyChange={jest.fn()}
        />
      )

      expect(screen.queryByTestId("plot-background-controls")).not.toBeInTheDocument()
    })
  })

  describe("section headers", () => {
    const renderSectioned = (props?: Record<string, unknown>) => render(
      <DisplayItemFormatControl
        dataConfiguration={createMockDataConfig() as any}
        displayItemDescription={createMockDescription() as any}
        showSectionHeaders={true}
        onBackgroundTransparencyChange={jest.fn()}
        onBackgroundColorChange={jest.fn()}
        {...props}
      />
    )

    it("renders no headings or regions when showSectionHeaders is not set", () => {
      // The map layers palette relies on this: it heads each layer with the layer's own name and
      // repeats these controls per layer, so it must get the flat layout.
      render(
        <DisplayItemFormatControl
          dataConfiguration={createMockDataConfig() as any}
          displayItemDescription={createMockDescription() as any}
          onBackgroundTransparencyChange={jest.fn()}
          onBackgroundColorChange={jest.fn()}
        />
      )

      expect(screen.queryByRole("heading")).not.toBeInTheDocument()
      expect(screen.queryByRole("region")).not.toBeInTheDocument()
      // The controls themselves are unaffected.
      expect(screen.getByTestId("point-size-slider")).toBeInTheDocument()
      expect(screen.getByTestId("plot-background-controls")).toBeInTheDocument()
    })

    it("renders both section headings when showSectionHeaders is set", () => {
      renderSectioned()

      expect(screen.getByRole("heading", { name: "V3.Inspector.section.dataPoints" })).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "V3.Inspector.section.graph" })).toBeInTheDocument()
    })

    it("exposes each section as a region labeled by its heading", () => {
      renderSectioned()

      // aria-labelledby has to resolve for the section to be announced as a named region.
      const dataPoints = screen.getByRole("region", { name: "V3.Inspector.section.dataPoints" })
      const graph = screen.getByRole("region", { name: "V3.Inspector.section.graph" })
      expect(dataPoints).toBeInTheDocument()
      expect(graph).toBeInTheDocument()
      expect(dataPoints).not.toBe(graph)
    })

    it("puts the point controls in Data Points and the background controls in Graph", () => {
      renderSectioned()

      const dataPoints = screen.getByRole("region", { name: "V3.Inspector.section.dataPoints" })
      const graph = screen.getByRole("region", { name: "V3.Inspector.section.graph" })

      expect(dataPoints).toContainElement(screen.getByTestId("point-size-slider"))
      expect(dataPoints).toContainElement(screen.getByTestId("legend-color-controls"))
      expect(dataPoints).toContainElement(screen.getByTestId("stroke-same-as-fill-checkbox"))
      expect(dataPoints).not.toContainElement(screen.getByTestId("plot-background-controls"))

      expect(graph).toContainElement(screen.getByTestId("plot-background-controls"))
      expect(graph).not.toContainElement(screen.getByTestId("point-size-slider"))
    })

    it("omits the Graph section when there are no background controls to put in it", () => {
      renderSectioned({ onBackgroundTransparencyChange: undefined, onBackgroundColorChange: undefined })

      expect(screen.getByRole("heading", { name: "V3.Inspector.section.dataPoints" })).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "V3.Inspector.section.graph" })).not.toBeInTheDocument()
    })
  })
})
