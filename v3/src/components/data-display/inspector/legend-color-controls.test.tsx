import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LegendColorControls, LegendBinsSelect } from "./legend-color-controls"

// Mock translation to return the key
jest.mock("../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
  translate: (key: string) => key
}))

// Mock PointColorSetting to render a simple swatch button
jest.mock("./point-color-setting", () => ({
  PointColorSetting: ({ propertyLabel, onColorChange, swatchBackgroundColor }: any) => (
    <button data-testid={`color-swatch-${propertyLabel}`}
      onClick={() => onColorChange("#123456")}
      style={{ backgroundColor: swatchBackgroundColor }}>
      {propertyLabel}
    </button>
  )
}))

const createMockDescription = (overrides?: Record<string, unknown>) => ({
  pointColor: "#0000FF",
  setPointColor: jest.fn(),
  applyModelChange: jest.fn((fn: () => void) => fn()),
  ...overrides
})

const createMockDataConfig = (overrides?: Record<string, unknown>) => ({
  attributeID: jest.fn(() => "attr-1"),
  attributeType: jest.fn(() => undefined),
  categoryArrayForAttrRole: jest.fn(() => []),
  metadata: {
    getAttributeColorRange: jest.fn(() => ({ low: "#0000FF", high: "#FF0000" })),
    getAttributeBinningType: jest.fn(() => "quantize"),
    setAttributeColor: jest.fn(),
    setAttributeBinningType: jest.fn(),
    applyModelChange: jest.fn((fn: () => void) => fn())
  },
  getLegendColorForCategory: jest.fn((cat: string) => cat === "cat-a" ? "#FF0000" : "#00FF00"),
  setLegendColorForCategory: jest.fn(),
  legendQuantilesAreLocked: false,
  setLegendQuantilesAreLocked: jest.fn(),
  applyModelChange: jest.fn((fn: () => void) => fn()),
  ...overrides
})

describe("LegendColorControls", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders single fill color picker when no legend attribute type", () => {
    const desc = createMockDescription()
    const config = createMockDataConfig()
    render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

    expect(screen.getByTestId("color-swatch-DG.Inspector.color")).toBeInTheDocument()
  })

  it("calls applyModelChange when fill color changes", async () => {
    const user = userEvent.setup()
    const desc = createMockDescription()
    const config = createMockDataConfig()
    render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

    await user.click(screen.getByTestId("color-swatch-DG.Inspector.color"))
    expect(desc.applyModelChange).toHaveBeenCalled()
    expect(desc.setPointColor).toHaveBeenCalledWith("#123456")
  })

  describe("categorical legend", () => {
    it("renders a color picker for each category", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "categorical"),
        categoryArrayForAttrRole: jest.fn(() => ["cat-a", "cat-b", "cat-c"])
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      expect(screen.getByTestId("color-swatch-cat-a")).toBeInTheDocument()
      expect(screen.getByTestId("color-swatch-cat-b")).toBeInTheDocument()
      expect(screen.getByTestId("color-swatch-cat-c")).toBeInTheDocument()
    })

    it("calls setLegendColorForCategory when a category color changes", async () => {
      const user = userEvent.setup()
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "categorical"),
        categoryArrayForAttrRole: jest.fn(() => ["cat-a"])
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      await user.click(screen.getByTestId("color-swatch-cat-a"))
      expect(config.applyModelChange).toHaveBeenCalled()
      expect(config.setLegendColorForCategory).toHaveBeenCalledWith("cat-a", "#123456")
    })
  })

  describe("numeric legend", () => {
    it("renders two color pickers and lock quantiles checkbox", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "numeric")
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      // Two color swatches (both labeled "DG.Inspector.legendColor")
      const swatches = screen.getAllByTestId("color-swatch-DG.Inspector.legendColor")
      expect(swatches).toHaveLength(2)
      // Lock quantiles checkbox
      expect(screen.getByTestId("lock-legend-quantiles-checkbox")).toBeInTheDocument()
      expect(screen.getByText("DG.Inspector.lockLegendQuantiles")).toBeInTheDocument()
    })

    it("toggles lock quantiles checkbox", async () => {
      const user = userEvent.setup()
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "numeric")
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      await user.click(screen.getByTestId("lock-legend-quantiles-checkbox"))
      expect(config.applyModelChange).toHaveBeenCalled()
      expect(config.setLegendQuantilesAreLocked).toHaveBeenCalledWith(true)
    })

    it("shows checkbox as selected when quantiles are locked", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "numeric"),
        legendQuantilesAreLocked: true
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      const checkbox = screen.getByTestId("lock-legend-quantiles-checkbox")
      expect(checkbox).toHaveAttribute("data-selected", "true")
    })
  })

  describe("color legend", () => {
    it("returns null for color-type legend attribute", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "color")
      })
      const { container } = render(
        <LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />
      )

      expect(container.innerHTML).toBe("")
    })
  })
})

describe("LegendBinsSelect", () => {
  it("renders select with label", () => {
    const config = createMockDataConfig()
    render(<LegendBinsSelect dataConfiguration={config as any} />)

    expect(screen.getByText("V3.Inspector.graph.legendBins")).toBeInTheDocument()
    expect(screen.getByTestId("legend-bins-type-select")).toBeInTheDocument()
  })

  it("renders with correct aria-label", () => {
    const config = createMockDataConfig()
    render(<LegendBinsSelect dataConfiguration={config as any} />)

    expect(screen.getByRole("button", { name: /V3.Inspector.graph.legendBins/i })).toBeInTheDocument()
  })
})
