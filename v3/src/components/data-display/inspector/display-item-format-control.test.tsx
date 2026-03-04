import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DisplayItemFormatControl } from "./display-item-format-control"

// Mock translation to return the key
jest.mock("../../../utilities/translation/translate", () => ({
  t: (key: string) => key
}))

// Mock PointColorSetting to render a simple swatch button
jest.mock("./point-color-setting", () => ({
  PointColorSetting: ({ propertyLabel, onColorChange }: any) => (
    <button data-testid={`color-swatch-${propertyLabel}`}
      onClick={() => onColorChange("#123456")}>
      {propertyLabel}
    </button>
  )
}))

// Mock sub-components to isolate DisplayItemFormatControl
jest.mock("./point-size-slider", () => ({
  PointSizeSlider: ({ pointDisplayType }: any) => (
    <div data-testid="point-size-slider" data-display-type={pointDisplayType}>PointSizeSlider</div>
  )
}))

jest.mock("./legend-color-controls", () => ({
  LegendColorControls: () => <div data-testid="legend-color-controls">LegendColorControls</div>,
  LegendBinsSelect: () => <div data-testid="legend-bins-select">LegendBinsSelect</div>
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
  ...overrides
})

const createMockDataConfig = (overrides?: Record<string, unknown>) => ({
  attributeID: jest.fn(() => ""),
  attributeType: jest.fn(() => undefined),
  ...overrides
})

describe("DisplayItemFormatControl", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

  it("shows LegendBinsSelect when legend attribute is numeric", () => {
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
  })

  it("hides LegendBinsSelect when legend attribute is not numeric", () => {
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
})
